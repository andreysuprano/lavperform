import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MessageStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { endOfDayInTz, startOfDayInTz } from '../../common/utils/date.utils';
import { normalizeStoredPhone } from '../../customers/application/customer-identifier';
import { PrismaService } from '../../prisma/prisma.service';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const ACTIVE_STATUSES = [
  MessageStatus.PENDING,
  MessageStatus.PROCESSING,
  MessageStatus.SENT,
];
const ABORTABLE_STATUSES = [MessageStatus.PENDING, MessageStatus.PROCESSING];
const TRANSACTION_MAX_WAIT_MS = 5_000;
const TRANSACTION_TIMEOUT_MS = 15_000;
const LOCK_TIMEOUT_MS = 5_000;

export const DAILY_AUTOMATIC_DUPLICATE_ERROR =
  'Mensagem automática duplicada para o mesmo cliente ou telefone no dia';

export type AutomaticMessageGuardIdentity = {
  companyId: string;
  customerId: string;
  phone?: string | null;
  now: Date;
};

type IdentityCandidate = {
  id: string;
  customerId: string;
  phone: string;
};

export type AutomaticMessageSnapshotIdentity = {
  id: string;
  customerId: string;
  phone?: string | null;
};

type NormalizedIdentity = {
  id?: string;
  customerId: string;
  phone: string | null;
};

type IdentityDecision =
  { allowed: true } | { allowed: false; blockerId: string };

type BlockerReference = {
  id: string;
  order: number;
};

class ChronologicalIdentityIndex {
  private readonly customers = new Map<string, BlockerReference>();
  private readonly phones = new Map<string, BlockerReference>();
  private nextOrder = 0;

  constructor(candidates: IdentityCandidate[] = []) {
    for (const candidate of candidates) {
      this.tryReserveNormalized(normalizeIdentity(candidate));
    }
  }

  blockerForNormalized(input: NormalizedIdentity): IdentityDecision {
    const customerBlocker = this.customers.get(input.customerId);
    const phoneBlocker = input.phone ? this.phones.get(input.phone) : undefined;
    const blocker =
      !customerBlocker ||
      (phoneBlocker && phoneBlocker.order < customerBlocker.order)
        ? phoneBlocker
        : customerBlocker;
    return blocker
      ? { allowed: false, blockerId: blocker.id }
      : { allowed: true };
  }

  tryReserveNormalized(input: NormalizedIdentity): IdentityDecision {
    const decision = this.blockerForNormalized(input);
    if (!decision.allowed) {
      return decision;
    }
    if (!input.id) {
      throw new Error('A reserva de identidade exige um id');
    }

    const reference = { id: input.id, order: this.nextOrder };
    this.nextOrder += 1;
    this.customers.set(input.customerId, reference);
    if (input.phone) {
      this.phones.set(input.phone, reference);
    }
    return { allowed: true };
  }
}

export class AutomaticMessageDailyGuardSnapshot {
  private readonly identities: ChronologicalIdentityIndex;

  constructor(winners: IdentityCandidate[]) {
    this.identities = new ChronologicalIdentityIndex(winners);
  }

  canGenerate(
    input: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
  ): boolean {
    return this.identities.blockerForNormalized(normalizeIdentity(input))
      .allowed;
  }

  tryReserve(input: AutomaticMessageSnapshotIdentity): IdentityDecision {
    return this.identities.tryReserveNormalized(normalizeIdentity(input));
  }
}

@Injectable()
export class AutomaticMessageDailyGuardService {
  private readonly logger = new Logger(AutomaticMessageDailyGuardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async canGenerate(input: AutomaticMessageGuardIdentity): Promise<boolean> {
    const snapshot = await this.loadDailySnapshot(input);
    return snapshot.canGenerate(input);
  }

  async loadDailySnapshot(
    input: Pick<AutomaticMessageGuardIdentity, 'companyId' | 'now'>,
  ): Promise<AutomaticMessageDailyGuardSnapshot> {
    const candidates = await this.prisma.message.findMany({
      where: this.dailyScope(input.companyId, input.now),
      select: {
        id: true,
        customerId: true,
        phone: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return new AutomaticMessageDailyGuardSnapshot(candidates);
  }

  async claimForProcessing(
    messageId: string,
  ): Promise<{ allowed: boolean; blockerId?: string }> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          `SET LOCAL lock_timeout = '${LOCK_TIMEOUT_MS}ms'`,
        );
        const current = await tx.message.findUnique({
          where: { id: messageId },
          select: {
            id: true,
            companyId: true,
            customerId: true,
            phone: true,
            automaticCampaignId: true,
            createdAt: true,
          },
        });

        if (!current) {
          throw new NotFoundException(`Mensagem ${messageId} não encontrada`);
        }
        if (!current.automaticCampaignId) {
          return { allowed: true };
        }

        const currentIdentity = normalizeIdentity(current);
        const day = DateTime.fromJSDate(current.createdAt, { zone: 'utc' })
          .setZone(SAO_PAULO_TIME_ZONE)
          .toISODate()!;
        for (const key of this.identityKeys(
          current,
          currentIdentity.phone,
          day,
        )) {
          await tx.$queryRaw`
            SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS lock
          `;
        }

        const candidates = await tx.message.findMany({
          where: {
            ...this.dailyScope(current.companyId, current.createdAt),
            OR: [
              { createdAt: { lt: current.createdAt } },
              {
                createdAt: current.createdAt,
                id: { lt: current.id },
              },
            ],
          },
          select: {
            id: true,
            customerId: true,
            phone: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        const decision = new ChronologicalIdentityIndex(
          candidates,
        ).blockerForNormalized(currentIdentity);

        if (decision.allowed) {
          return { allowed: true };
        }

        const aborted = await tx.message.updateMany({
          where: {
            id: current.id,
            status: { in: ABORTABLE_STATUSES },
          },
          data: {
            status: MessageStatus.ABORTED,
            error: DAILY_AUTOMATIC_DUPLICATE_ERROR,
          },
        });

        if (aborted.count === 0) {
          this.logger.warn(
            `Mensagem ${current.id} continuou bloqueada, mas seu estado mudou antes do aborto`,
          );
        }

        return { allowed: false, blockerId: decision.blockerId };
      },
      {
        maxWait: TRANSACTION_MAX_WAIT_MS,
        timeout: TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  private dailyScope(companyId: string, at: Date): Prisma.MessageWhereInput {
    return {
      companyId,
      automaticCampaignId: { not: null },
      status: { in: ACTIVE_STATUSES },
      createdAt: {
        gte: startOfDayInTz(at, SAO_PAULO_TIME_ZONE),
        lte: endOfDayInTz(at, SAO_PAULO_TIME_ZONE),
      },
    };
  }

  private identityKeys(
    input: Pick<AutomaticMessageGuardIdentity, 'companyId' | 'customerId'>,
    normalizedPhone: string | null,
    day: string,
  ): string[] {
    return [
      `${input.companyId}:${day}:customer:${input.customerId}`,
      ...(normalizedPhone
        ? [`${input.companyId}:${day}:phone:${normalizedPhone}`]
        : []),
    ].sort();
  }
}

function normalizeIdentity(
  input: Pick<AutomaticMessageSnapshotIdentity, 'customerId' | 'phone'> & {
    id?: string;
  },
): NormalizedIdentity {
  return {
    id: input.id,
    customerId: input.customerId,
    phone: normalizeStoredPhone(input.phone),
  };
}
