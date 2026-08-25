import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, CustomerMergeReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import {
  normalizeCpfDigits,
  normalizeStoredPhone,
} from '../../customers/application/customer-identifier';
import {
  pickSurvivor,
  sharedIdentifiersToClear,
  splitDuplicateGroup,
  type DuplicateGroup,
} from './customer-duplicate.classification';
import {
  planMergedProfile,
  type MergeableCustomer,
} from './customer-merge-profile';

export type DuplicateReviewCustomer = {
  id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  orderCount: number;
  createdAt: Date;
};

export type DuplicateReviewGroup = {
  id: string;
  source: 'phone' | 'cpf' | 'cross';
  matchValue: string | null;
  reviewId: string | null;
  customers: DuplicateReviewCustomer[];
};

export type CustomerDuplicatesPreview = {
  companyId: string;
  autoMergeGroups: number;
  reviewGroups: number;
  groupsToAutoMerge: Array<{
    matchType: 'phone' | 'cpf';
    matchValue: string;
    survivorId: string;
    absorbedIds: string[];
  }>;
  review: DuplicateReviewGroup[];
};

@Injectable()
export class CustomerDuplicateService {
  private readonly logger = new Logger(CustomerDuplicateService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.RFV_CALCULATION)
    private readonly rfvCalculationQueue: Queue,
  ) {}

  async preview(companyId: string): Promise<CustomerDuplicatesPreview> {
    const { autoGroups, reviewGroups } = await this.collectGroups(companyId);
    const cross = await this.listPendingCrossReviews(companyId);

    return {
      companyId,
      autoMergeGroups: autoGroups.length,
      reviewGroups: reviewGroups.length + cross.length,
      groupsToAutoMerge: autoGroups.map((group) => {
        const survivor = pickSurvivor(group.members);
        return {
          matchType: group.matchType,
          matchValue: group.matchValue,
          survivorId: survivor.id,
          absorbedIds: group.members
            .filter((member) => member.id !== survivor.id)
            .map((member) => member.id),
        };
      }),
      review: [...reviewGroups.map((group) => this.toReviewGroup(group)), ...cross],
    };
  }

  async normalizeIdentifiers(companyId: string): Promise<{ updated: number }> {
    const customers = await this.prisma.customer.findMany({
      where: { companyId },
      select: { id: true, phone: true, cpf: true },
    });

    let updated = 0;
    for (const customer of customers) {
      const phone = normalizeStoredPhone(customer.phone);
      const cpf = normalizeCpfDigits(customer.cpf);
      const phoneChanged = phone !== customer.phone;
      const cpfChanged = cpf !== customer.cpf;
      if (!phoneChanged && !cpfChanged) continue;

      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          ...(phoneChanged ? { phone } : {}),
          ...(cpfChanged ? { cpf } : {}),
        },
      });
      updated += 1;
    }

    return { updated };
  }

  async scanAndAutoMerge(
    companyId: string,
    options?: { dryRun?: boolean },
  ): Promise<{
    companyId: string;
    normalized: number;
    mergedGroups: number;
    absorbed: number;
    skipped: number;
    pendingAutoGroups: number;
    reviewGroups: number;
    dryRun: boolean;
  }> {
    const dryRun = options?.dryRun === true;

    if (dryRun) {
      const preview = await this.preview(companyId);
      return {
        companyId,
        normalized: 0,
        mergedGroups: 0,
        absorbed: 0,
        skipped: 0,
        pendingAutoGroups: preview.autoMergeGroups,
        reviewGroups: preview.reviewGroups,
        dryRun: true,
      };
    }

    const { updated: normalized } = await this.normalizeIdentifiers(companyId);
    const firstPreview = await this.preview(companyId);

    let mergedGroups = 0;
    let absorbed = 0;
    let skipped = 0;
    let preview = firstPreview;

    for (let pass = 0; pass < 20; pass += 1) {
      if (preview.groupsToAutoMerge.length === 0) break;

      for (const group of preview.groupsToAutoMerge) {
        try {
          const result = await this.merge(companyId, group.survivorId, group.absorbedIds);
          mergedGroups += 1;
          absorbed += result.absorbedIds.length;
        } catch (error) {
          if (error instanceof ConflictException) {
            skipped += 1;
            continue;
          }
          throw error;
        }
      }

      preview = await this.preview(companyId);
    }

    return {
      companyId,
      normalized,
      mergedGroups,
      absorbed,
      skipped,
      pendingAutoGroups: preview.autoMergeGroups,
      reviewGroups: preview.reviewGroups,
      dryRun: false,
    };
  }

  async merge(
    companyId: string,
    survivorId: string,
    absorbedIds: string[],
    adminUserId?: string,
  ) {
    const uniqueAbsorbed = [...new Set(absorbedIds)].filter((id) => id !== survivorId);
    if (uniqueAbsorbed.length === 0) {
      throw new BadRequestException('Informe ao menos um cadastro para absorver');
    }

    const ids = [survivorId, ...uniqueAbsorbed];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
    });

    if (customers.length !== ids.length) {
      throw new ConflictException('Um ou mais cadastros já foram removidos');
    }

    const foreign = customers.find((customer) => customer.companyId !== companyId);
    if (foreign) {
      throw new BadRequestException('Todos os cadastros precisam ser da mesma empresa');
    }

    const survivor = customers.find((customer) => customer.id === survivorId);
    if (!survivor) {
      throw new NotFoundException('Cliente sobrevivente não encontrado');
    }

    const absorbed = customers.filter((customer) => customer.id !== survivorId);
    const plan = planMergedProfile(survivor as MergeableCustomer, absorbed as MergeableCustomer[]);

    await this.prisma.$transaction(async (tx) => {
      const safePhone = await this.avoidForeignIdentifier(
        tx,
        companyId,
        ids,
        'phone',
        plan.phone,
        survivor.phone,
      );
      const safeCpf = await this.avoidForeignIdentifier(
        tx,
        companyId,
        ids,
        'cpf',
        plan.cpf,
        survivor.cpf,
      );

      await tx.order.updateMany({
        where: { customerId: { in: uniqueAbsorbed } },
        data: { customerId: survivorId },
      });
      await tx.message.updateMany({
        where: { customerId: { in: uniqueAbsorbed } },
        data: { customerId: survivorId },
      });

      if (plan.stealAddressFromCustomerId && plan.addressId) {
        await tx.customer.update({
          where: { id: plan.stealAddressFromCustomerId },
          data: { addressId: null },
        });
      }

      const orderStats = await tx.order.aggregate({
        where: { customerId: survivorId },
        _min: { createdAt: true },
        _max: { createdAt: true },
        _sum: { total: true },
        _count: { _all: true },
      });
      const orderCount = Number(orderStats._count?._all || 0);
      const totalSpent = Number(orderStats._sum?.total || 0);

      await tx.customer.update({
        where: { id: survivorId },
        data: {
          name: plan.name,
          phone: safePhone,
          email: plan.email,
          cpf: safeCpf,
          birthDate: plan.birthDate,
          gender: plan.gender,
          observations: plan.observations,
          avatarUrl: plan.avatarUrl,
          whatsappVerified: plan.whatsappVerified,
          whatsappVerifiedAt: plan.whatsappVerifiedAt,
          whatsappOptin: plan.whatsappOptin,
          addressId: plan.addressId,
          firstOrderDate: orderStats._min.createdAt,
          lastOrderDate: orderStats._max.createdAt,
          averageTicket: orderCount > 0 ? totalSpent / orderCount : 0,
        },
      });

      await tx.customer.deleteMany({
        where: { id: { in: uniqueAbsorbed } },
      });

      if (plan.deleteOrphanAddressIds.length > 0) {
        await tx.address.deleteMany({
          where: { id: { in: plan.deleteOrphanAddressIds } },
        });
      }

      await tx.customerMergeReview.updateMany({
        where: {
          companyId,
          status: CustomerMergeReviewStatus.PENDING_REVIEW,
          OR: [
            { customerIdA: { in: ids } },
            { customerIdB: { in: ids } },
          ],
        },
        data: {
          status: CustomerMergeReviewStatus.MERGED,
          resolvedSurvivorId: survivorId,
          resolvedAt: new Date(),
          resolvedByAdminId: adminUserId,
        },
      });
    });

    try {
      await this.rfvCalculationQueue.add('calculate', { customerId: survivorId });
    } catch (error) {
      this.logger.warn(
        `Falha ao enfileirar RFV do sobrevivente ${survivorId}: ${(error as Error)?.message}`,
      );
    }

    return { survivorId, absorbedIds: uniqueAbsorbed };
  }

  async keepSeparate(
    companyId: string,
    keepIdentifierOnCustomerId: string,
    peerIds: string[],
    adminUserId?: string,
  ) {
    const ids = [keepIdentifierOnCustomerId, ...peerIds];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids }, companyId },
    });
    if (customers.length !== new Set(ids).size) {
      throw new NotFoundException('Cadastro não encontrado nesta empresa');
    }

    const keeper = customers.find((customer) => customer.id === keepIdentifierOnCustomerId);
    if (!keeper) {
      throw new NotFoundException('Cadastro principal não encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const peer of customers.filter((customer) => customer.id !== keeper.id)) {
        const clear = sharedIdentifiersToClear(keeper, peer);
        if (!clear.phone && !clear.cpf) continue;
        await tx.customer.update({
          where: { id: peer.id },
          data: {
            ...(clear.phone ? { phone: null } : {}),
            ...(clear.cpf ? { cpf: null } : {}),
          },
        });
      }

      await tx.customerMergeReview.updateMany({
        where: {
          companyId,
          status: CustomerMergeReviewStatus.PENDING_REVIEW,
          OR: [
            { customerIdA: { in: ids } },
            { customerIdB: { in: ids } },
          ],
        },
        data: {
          status: CustomerMergeReviewStatus.KEPT_SEPARATE,
          resolvedSurvivorId: keepIdentifierOnCustomerId,
          resolvedAt: new Date(),
          resolvedByAdminId: adminUserId,
        },
      });
    });

    return { keepIdentifierOnCustomerId, peerIds };
  }

  private async avoidForeignIdentifier(
    tx: Prisma.TransactionClient,
    companyId: string,
    mergeIds: string[],
    field: 'phone' | 'cpf',
    planned: string | null,
    current: string | null,
  ): Promise<string | null> {
    if (!planned || planned === current) return planned;
    const other = await tx.customer.findFirst({
      where: {
        companyId,
        [field]: planned,
        id: { notIn: mergeIds },
      },
      select: { id: true },
    });
    return other ? current : planned;
  }

  private async collectGroups(companyId: string): Promise<{
    autoGroups: DuplicateGroup[];
    reviewGroups: DuplicateGroup[];
  }> {
    const [phoneRows, cpfRows] = await Promise.all([
      this.prisma.customer.groupBy({
        by: ['phone'],
        where: {
          companyId,
          phone: { not: null },
          NOT: { phone: '' },
        },
        _count: { _all: true },
      }),
      this.prisma.customer.groupBy({
        by: ['cpf'],
        where: {
          companyId,
          cpf: { not: null },
          NOT: { cpf: '' },
        },
        _count: { _all: true },
      }),
    ]);

    const groups: DuplicateGroup[] = [];

    for (const row of phoneRows) {
      if (!row.phone || row._count._all < 2) continue;
      groups.push(await this.loadGroup(companyId, 'phone', row.phone));
    }
    for (const row of cpfRows) {
      if (!row.cpf || row._count._all < 2) continue;
      groups.push(await this.loadGroup(companyId, 'cpf', row.cpf));
    }

    const autoGroups: DuplicateGroup[] = [];
    const reviewGroups: DuplicateGroup[] = [];
    for (const group of groups) {
      const split = splitDuplicateGroup(group);
      autoGroups.push(...split.autoClusters);
      if (split.reviewMembers.length >= 2) {
        reviewGroups.push({
          matchType: group.matchType,
          matchValue: group.matchValue,
          members: split.reviewMembers,
        });
      }
    }

    return { autoGroups, reviewGroups };
  }

  private async loadGroup(
    companyId: string,
    matchType: 'phone' | 'cpf',
    matchValue: string,
  ): Promise<DuplicateGroup> {
    const rows = await this.prisma.customer.findMany({
      where: { companyId, [matchType]: matchValue },
      select: {
        id: true,
        name: true,
        phone: true,
        cpf: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    return {
      matchType,
      matchValue,
      members: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        cpf: row.cpf,
        createdAt: row.createdAt,
        orderCount: row._count.orders,
      })),
    };
  }

  private toReviewGroup(group: DuplicateGroup): DuplicateReviewGroup {
    return {
      id: `${group.matchType}:${group.matchValue}`,
      source: group.matchType,
      matchValue: group.matchValue,
      reviewId: null,
      customers: group.members.map((member) => ({
        id: member.id,
        name: member.name,
        phone: member.phone,
        cpf: member.cpf,
        orderCount: member.orderCount ?? 0,
        createdAt: member.createdAt,
      })),
    };
  }

  private async listPendingCrossReviews(companyId: string): Promise<DuplicateReviewGroup[]> {
    const reviews = await this.prisma.customerMergeReview.findMany({
      where: { companyId, status: CustomerMergeReviewStatus.PENDING_REVIEW },
      orderBy: { createdAt: 'desc' },
    });
    if (reviews.length === 0) return [];

    const customerIds = [...new Set(reviews.flatMap((review) => [review.customerIdA, review.customerIdB]))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        name: true,
        phone: true,
        cpf: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });
    const byId = new Map(customers.map((customer) => [customer.id, customer]));
    const groups: DuplicateReviewGroup[] = [];

    for (const review of reviews) {
      const first = byId.get(review.customerIdA);
      const second = byId.get(review.customerIdB);
      if (!first || !second) continue;
      groups.push({
        id: review.id,
        source: 'cross',
        matchValue: null,
        reviewId: review.id,
        customers: [first, second].map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          cpf: customer.cpf,
          orderCount: customer._count.orders,
          createdAt: customer.createdAt,
        })),
      });
    }

    return groups;
  }
}
