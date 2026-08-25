import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICustomSendListRepository } from '../../domain/custom-send-list.repository.interface';
import { CustomSendListMapper } from './mappers/custom-send-list.mapper';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class CustomSendListPrismaRepository implements ICustomSendListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    companyId: string;
    name: string;
    description?: string | null;
    customerIds: string[];
  }) {
    const created = await this.prisma.$transaction(async (tx) => {
      const list = await tx.customSendList.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          description: data.description ?? null,
        },
      });

      if (data.customerIds.length > 0) {
        await tx.customSendListMember.createMany({
          data: data.customerIds.map((customerId) => ({
            listId: list.id,
            customerId,
          })),
        });
      }

      return list;
    });

    return CustomSendListMapper.toDomain(created);
  }

  async findById(id: string) {
    const row = await this.prisma.customSendList.findUnique({ where: { id } });
    return row ? CustomSendListMapper.toDomain(row) : null;
  }

  async findAllWithFilters(companyId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc' } =
      pagination;

    const where = {
      companyId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.customSendList.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
      }),
      this.prisma.customSendList.count({ where }),
    ]);

    return {
      items: items.map(CustomSendListMapper.toDomain),
      total,
    };
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string | null }>,
  ) {
    const updated = await this.prisma.customSendList.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    return CustomSendListMapper.toDomain(updated);
  }

  async replaceMembers(listId: string, customerIds: string[]) {
    if (customerIds.length === 0) {
      await this.prisma.customSendListMember.deleteMany({ where: { listId } });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.customSendListMember.deleteMany({ where: { listId } }),
      this.prisma.customSendListMember.createMany({
          data: customerIds.map((customerId) => ({
            listId,
            customerId,
          })),
          skipDuplicates: true,
        }),
    ]);
  }

  async updateMembers(
    listId: string,
    addCustomerIds: string[],
    removeCustomerIds: string[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      if (removeCustomerIds.length > 0) {
        await tx.customSendListMember.deleteMany({
          where: { listId, customerId: { in: removeCustomerIds } },
        });
      }

      if (addCustomerIds.length > 0) {
        await tx.customSendListMember.createMany({
          data: addCustomerIds.map((customerId) => ({ listId, customerId })),
          skipDuplicates: true,
        });
      }
    });
  }

  async countMembers(listId: string): Promise<number> {
    return this.prisma.customSendListMember.count({ where: { listId } });
  }

  async findMembersPaginated(listId: string, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;

    const where = { listId };

    const [rows, total] = await Promise.all([
      this.prisma.customSendListMember.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.customSendListMember.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
      })),
      total,
    };
  }

  async findAllMemberIds(listId: string): Promise<string[]> {
    const rows = await this.prisma.customSendListMember.findMany({
      where: { listId },
      select: { customerId: true },
    });

    return rows.map((row) => row.customerId);
  }

  async addMember(listId: string, customerId: string): Promise<void> {
    await this.prisma.customSendListMember.createMany({
      data: [{ listId, customerId }],
      skipDuplicates: true,
    });
  }

  async softDelete(id: string) {
    const deleted = await this.prisma.customSendList.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return CustomSendListMapper.toDomain(deleted);
  }

  async countActiveCampaignReferences(listId: string): Promise<number> {
    const [campaigns, automaticCampaigns] = await Promise.all([
      this.prisma.campaign.count({
        where: {
          customSendListId: listId,
          status: { in: ['WAITING', 'PROCESSING'] },
        },
      }),
      this.prisma.automaticCampaign.count({
        where: {
          customSendListId: listId,
          active: true,
          deletedAt: null,
        },
      }),
    ]);

    return campaigns + automaticCampaigns;
  }
}
