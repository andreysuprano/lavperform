import { Injectable, NotFoundException } from '@nestjs/common';
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

export class AutomaticMessageDailyGuardSnapshot {
  private readonly customerIds = new Set<string>();
  private readonly phones = new Set<string>();

  constructor(winners: IdentityCandidate[]) {
    for (const winner of winners) {
      this.reserve(winner);
    }
  }

  canGenerate(
    input: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
  ): boolean {
    const phone = normalizeStoredPhone(input.phone);
    return (
      !this.customerIds.has(input.customerId) &&
      (phone === null || !this.phones.has(phone))
    );
  }

  tryReserve(
    input: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
  ): boolean {
    if (!this.canGenerate(input)) {
      return false;
    }
    this.reserve(input);
    return true;
  }

  private reserve(
    input: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
  ): void {
    this.customerIds.add(input.customerId);
    const phone = normalizeStoredPhone(input.phone);
    if (phone !== null) {
      this.phones.add(phone);
    }
  }
}

@Injectable()
export class AutomaticMessageDailyGuardService {
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

    return new AutomaticMessageDailyGuardSnapshot(
      this.selectChronologicalWinners(candidates),
    );
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

        const day = DateTime.fromJSDate(current.createdAt, { zone: 'utc' })
          .setZone(SAO_PAULO_TIME_ZONE)
          .toISODate()!;
        for (const key of this.identityKeys(current, day)) {
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
        const blocker = this.selectChronologicalWinners(candidates).find(
          (winner) => identitiesMatch(winner, current),
        );

        if (!blocker) {
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
          await tx.message.findUnique({
            where: { id: current.id },
            select: { status: true },
          });
        }

        return { allowed: false, blockerId: blocker.id };
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
    input: Pick<
      AutomaticMessageGuardIdentity,
      'companyId' | 'customerId' | 'phone'
    >,
    day: string,
  ): string[] {
    const phone = normalizeStoredPhone(input.phone);
    return [
      `${input.companyId}:${day}:customer:${input.customerId}`,
      ...(phone ? [`${input.companyId}:${day}:phone:${phone}`] : []),
    ].sort();
  }

  private selectChronologicalWinners(
    candidates: IdentityCandidate[],
  ): IdentityCandidate[] {
    const winners: IdentityCandidate[] = [];
    for (const candidate of candidates) {
      if (!winners.some((winner) => identitiesMatch(winner, candidate))) {
        winners.push(candidate);
      }
    }
    return winners;
  }
}

function identitiesMatch(
  left: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
  right: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
): boolean {
  if (left.customerId === right.customerId) {
    return true;
  }
  const leftPhone = normalizeStoredPhone(left.phone);
  return leftPhone !== null && leftPhone === normalizeStoredPhone(right.phone);
}
