import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAudienceRepository } from '../../domain/audience.repository.interface';
import { AudienceMapper } from './mappers/audience.mapper';
import { AudienceDefinition } from '../../domain/audience-definition.types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class AudiencePrismaRepository implements IAudienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    companyId: string;
    name: string;
    description?: string | null;
    definition: AudienceDefinition;
  }) {
    const created = await this.prisma.audience.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        description: data.description ?? null,
        definition: data.definition as unknown as Prisma.InputJsonValue,
      },
    });

    return AudienceMapper.toDomain(created);
  }

  async findById(id: string) {
    const audience = await this.prisma.audience.findUnique({ where: { id } });
    return audience ? AudienceMapper.toDomain(audience) : null;
  }

  async findAllWithFilters(companyId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc' } =
      pagination;

    const where = {
      companyId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.audience.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
      }),
      this.prisma.audience.count({ where }),
    ]);

    return {
      items: items.map(AudienceMapper.toDomain),
      total,
    };
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      definition: AudienceDefinition;
    }>,
  ) {
    const updated = await this.prisma.audience.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.definition !== undefined
          ? { definition: data.definition as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    return AudienceMapper.toDomain(updated);
  }

  async softDelete(id: string) {
    const deleted = await this.prisma.audience.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return AudienceMapper.toDomain(deleted);
  }

  async countActiveCampaignReferences(audienceId: string): Promise<number> {
    const [campaigns, automaticCampaigns] = await Promise.all([
      this.prisma.campaign.count({
        where: {
          audienceId,
          status: { in: ['WAITING', 'PROCESSING'] },
        },
      }),
      this.prisma.automaticCampaign.count({
        where: {
          audienceId,
          active: true,
          deletedAt: null,
        },
      }),
    ]);

    return campaigns + automaticCampaigns;
  }

  async findDistinctProductNames(companyId: string, search?: string) {
    const rows = await this.prisma.orderItem.findMany({
      where: {
        order: { companyId },
        ...(search
          ? { name: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      distinct: ['name'],
      select: { name: true },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return rows.map((row) => row.name);
  }

  async findDistinctNeighborhoods(companyId: string, search?: string) {
    const rows = await this.prisma.address.findMany({
      where: {
        customer: { companyId },
        neighborhood: {
          not: null,
          ...(search ? { contains: search, mode: 'insensitive' } : {}),
        },
      },
      distinct: ['neighborhood'],
      select: { neighborhood: true },
      orderBy: { neighborhood: 'asc' },
      take: 50,
    });

    return rows
      .map((row) => row.neighborhood)
      .filter((value): value is string => Boolean(value));
  }

  async findDistinctCities(companyId: string, search?: string) {
    const rows = await this.prisma.address.findMany({
      where: {
        customer: { companyId },
        city: {
          not: null,
          ...(search ? { contains: search, mode: 'insensitive' } : {}),
        },
      },
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
      take: 50,
    });

    return rows.map((row) => row.city).filter((value): value is string => Boolean(value));
  }

  async findDistinctDdds(companyId: string, search?: string) {
    const searchDigits = search?.replace(/\D/g, '').slice(0, 2) ?? '';

    const rows = searchDigits
      ? await this.prisma.$queryRaw<Array<{ ddd: string }>>`
          SELECT DISTINCT SUBSTRING(phone FROM 3 FOR 2) AS ddd
          FROM "Customer"
          WHERE "companyId" = ${companyId}
            AND phone IS NOT NULL
            AND phone LIKE '55%'
            AND LENGTH(phone) IN (12, 13)
            AND phone ~ '^[0-9]+$'
            AND SUBSTRING(phone FROM 3 FOR 2) LIKE ${`${searchDigits}%`}
          ORDER BY ddd ASC
          LIMIT 70
        `
      : await this.prisma.$queryRaw<Array<{ ddd: string }>>`
          SELECT DISTINCT SUBSTRING(phone FROM 3 FOR 2) AS ddd
          FROM "Customer"
          WHERE "companyId" = ${companyId}
            AND phone IS NOT NULL
            AND phone LIKE '55%'
            AND LENGTH(phone) IN (12, 13)
            AND phone ~ '^[0-9]+$'
          ORDER BY ddd ASC
          LIMIT 70
        `;

    return rows
      .map((row) => row.ddd)
      .filter((ddd): ddd is string => Boolean(ddd) && /^\d{2}$/.test(ddd));
  }
}
