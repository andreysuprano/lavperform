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

@Injectable()
export class AutomaticMessageDailyGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async canGenerate(input: AutomaticMessageGuardIdentity): Promise<boolean> {
    const candidates = await this.prisma.message.findMany({
      where: this.dailyScope(input.companyId, input.now),
      select: {
        id: true,
        customerId: true,
        phone: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return !this.findIdentityBlocker(candidates, input);
  }

  async claimForProcessing(
    messageId: string,
  ): Promise<{ allowed: boolean; blockerId?: string }> {
    return this.prisma.$transaction(async (tx) => {
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
      const blocker = this.findIdentityBlocker(candidates, current);

      if (!blocker) {
        return { allowed: true };
      }

      await tx.message.updateMany({
        where: {
          id: current.id,
          status: MessageStatus.PROCESSING,
        },
        data: {
          status: MessageStatus.ABORTED,
          error: DAILY_AUTOMATIC_DUPLICATE_ERROR,
        },
      });

      return { allowed: false, blockerId: blocker.id };
    });
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

  private findIdentityBlocker(
    candidates: IdentityCandidate[],
    input: Pick<AutomaticMessageGuardIdentity, 'customerId' | 'phone'>,
  ): IdentityCandidate | undefined {
    const phone = normalizeStoredPhone(input.phone);
    return candidates.find(
      (candidate) =>
        candidate.customerId === input.customerId ||
        (phone !== null && normalizeStoredPhone(candidate.phone) === phone),
    );
  }
}
