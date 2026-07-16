import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AudienceDefinition,
  Criterion,
  isRuleGroup,
  RuleGroup,
  validateAudienceDefinition,
} from '../domain/audience-definition.types';

interface ProductFilterValue {
  productName?: string;
  itemId?: number;
  externalCode?: string;
  days?: number;
}

@Injectable()
export class AudienceQueryEngine {
  constructor(private readonly prisma: PrismaService) {}

  validateDefinition(definition: unknown): AudienceDefinition {
    return validateAudienceDefinition(definition);
  }

  async resolveCustomerIds(
    companyId: string,
    definition: AudienceDefinition,
  ): Promise<string[]> {
    const validated = this.validateDefinition(definition);
    const includeIds = await this.resolveRuleGroupIds(validated.include, companyId);

    if (!validated.exclude || includeIds.length === 0) {
      return includeIds;
    }

    const excludeIds = new Set(
      await this.resolveRuleGroupIds(validated.exclude, companyId),
    );

    return includeIds.filter((id) => !excludeIds.has(id));
  }

  async countCustomers(companyId: string, definition: AudienceDefinition): Promise<number> {
    const ids = await this.resolveCustomerIds(companyId, definition);
    return ids.length;
  }

  async previewCustomers(
    companyId: string,
    definition: AudienceDefinition,
    sampleLimit = 10,
  ) {
    const ids = await this.resolveCustomerIds(companyId, definition);

    const sample = ids.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: ids.slice(0, sampleLimit) } },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            rfvClassification: true,
            address: {
              select: { neighborhood: true, city: true },
            },
          },
        })
      : [];

    return { count: ids.length, sample };
  }

  private async resolveRuleGroupIds(
    group: RuleGroup,
    companyId: string,
  ): Promise<string[]> {
    const ruleResults = await Promise.all(
      group.rules.map((rule) =>
        isRuleGroup(rule)
          ? this.resolveRuleGroupIds(rule, companyId)
          : this.resolveCriterionIds(rule, companyId),
      ),
    );

    if (group.operator === 'OR') {
      return [...new Set(ruleResults.flat())];
    }

    if (ruleResults.length === 0) {
      return [];
    }

    return ruleResults.reduce((acc, ids) => {
      const idSet = new Set(ids);
      return acc.filter((id) => idSet.has(id));
    });
  }

  private async resolveCriterionIds(
    criterion: Criterion,
    companyId: string,
  ): Promise<string[]> {
    if (criterion.type === 'total_orders') {
      return this.resolveTotalOrdersIds(criterion, companyId);
    }

    if (criterion.type === 'average_ticket') {
      return this.resolveAverageTicketIds(criterion, companyId);
    }

    const where = this.buildCriterionWhere(criterion, companyId);
    const customers = await this.prisma.customer.findMany({
      where,
      select: { id: true },
    });

    return customers.map((customer) => customer.id);
  }

  private buildCriterionWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    switch (criterion.type) {
      case 'rfv_classification':
        return this.buildRfvWhere(criterion, companyId);
      case 'last_order_days':
        return this.buildLastOrderDaysWhere(criterion, companyId);
      case 'neighborhood':
        return this.buildAddressFieldWhere('neighborhood', criterion, companyId);
      case 'city':
        return this.buildAddressFieldWhere('city', criterion, companyId);
      case 'purchased_product':
        return this.buildPurchasedProductWhere(criterion, companyId);
      case 'whatsapp_verified':
        return {
          companyId,
          whatsappVerified: Boolean(criterion.value),
        };
      case 'has_orders':
        return {
          companyId,
          ...(Boolean(criterion.value)
            ? { orders: { some: {} } }
            : { orders: { none: {} } }),
        };
      default:
        return { companyId };
    }
  }

  private buildRfvWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const values = Array.isArray(criterion.value)
      ? (criterion.value as string[])
      : String(criterion.value).split(',').map((v) => v.trim());

    if (criterion.operator === 'not_in') {
      return { companyId, rfvClassification: { notIn: values } };
    }

    return { companyId, rfvClassification: { in: values } };
  }

  private buildLastOrderDaysWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const now = new Date();

    if (criterion.operator === 'between') {
      const [maxDays, minDays] = this.parseBetween(criterion.value);
      return {
        companyId,
        AND: [
          { orders: { none: { createdAt: { gte: this.subDays(now, minDays) } } } },
          { orders: { some: { createdAt: { gte: this.subDays(now, maxDays) } } } },
        ],
      };
    }

    const days = Number(criterion.value);

    switch (criterion.operator) {
      case 'gte':
        return {
          companyId,
          orders: { none: { createdAt: { gte: this.subDays(now, days) } } },
        };
      case 'gt':
        return {
          companyId,
          orders: { none: { createdAt: { gte: this.subDays(now, days + 1) } } },
        };
      case 'lte':
        return {
          companyId,
          orders: { some: { createdAt: { gte: this.subDays(now, days) } } },
        };
      case 'lt':
        return {
          companyId,
          orders: { some: { createdAt: { gte: this.subDays(now, days - 1) } } },
        };
      case 'eq':
      default:
        return {
          companyId,
          AND: [
            { orders: { none: { createdAt: { gte: this.subDays(now, days - 1) } } } },
            { orders: { some: { createdAt: { gte: this.subDays(now, days + 1) } } } },
          ],
        };
    }
  }

  private buildAddressFieldWhere(
    field: 'neighborhood' | 'city',
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const addressFilter: Prisma.AddressWhereInput = {};

    if (criterion.operator === 'in') {
      const values = Array.isArray(criterion.value)
        ? (criterion.value as string[])
        : String(criterion.value).split(',').map((v) => v.trim());
      addressFilter[field] = { in: values, mode: 'insensitive' };
    } else if (criterion.operator === 'contains') {
      addressFilter[field] = {
        contains: String(criterion.value),
        mode: 'insensitive',
      };
    } else {
      addressFilter[field] = {
        equals: String(criterion.value),
        mode: 'insensitive',
      };
    }

    return { companyId, address: addressFilter };
  }

  private buildPurchasedProductWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const productValue = criterion.value as ProductFilterValue | string;
    const parsed: ProductFilterValue =
      typeof productValue === 'string'
        ? { productName: productValue }
        : productValue;

    const itemFilter = this.buildProductItemFilter(parsed);
    const now = new Date();

    if (criterion.operator === 'ever') {
      return {
        companyId,
        orders: {
          some: {
            items: { some: itemFilter },
          },
        },
      };
    }

    const days = parsed.days ?? 30;

    if (criterion.operator === 'within_days') {
      return {
        companyId,
        orders: {
          some: {
            createdAt: { gte: this.subDays(now, days) },
            items: { some: itemFilter },
          },
        },
      };
    }

    return {
      companyId,
      orders: {
        none: {
          createdAt: { gte: this.subDays(now, days) },
          items: { some: itemFilter },
        },
      },
    };
  }

  private buildProductItemFilter(
    parsed: ProductFilterValue,
  ): Prisma.OrderItemWhereInput {
    const conditions: Prisma.OrderItemWhereInput[] = [];

    if (parsed.productName) {
      conditions.push({
        name: { contains: parsed.productName, mode: 'insensitive' },
      });
    }

    if (parsed.itemId !== undefined) {
      conditions.push({ itemId: parsed.itemId });
    }

    if (parsed.externalCode) {
      conditions.push({ externalCode: parsed.externalCode });
    }

    if (conditions.length === 0) {
      return { name: { contains: '', mode: 'insensitive' } };
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  private async resolveTotalOrdersIds(
    criterion: Criterion,
    companyId: string,
  ): Promise<string[]> {
    const count = Number(criterion.value);
    const operator = criterion.operator;

    if (operator === 'eq' && count === 0) {
      const customers = await this.prisma.customer.findMany({
        where: { companyId, orders: { none: {} } },
        select: { id: true },
      });
      return customers.map((c) => c.id);
    }

    const havingClause = this.buildHavingClause(operator, count);

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Order" o ON o."customerId" = c.id
      WHERE c."companyId" = ${companyId}
      GROUP BY c.id
      HAVING ${havingClause}
    `;

    return rows.map((row) => row.id);
  }

  private buildHavingClause(
    operator: Criterion['operator'],
    count: number,
  ): Prisma.Sql {
    switch (operator) {
      case 'eq':
        return Prisma.sql`COUNT(o.id) = ${count}`;
      case 'gt':
        return Prisma.sql`COUNT(o.id) > ${count}`;
      case 'gte':
        return Prisma.sql`COUNT(o.id) >= ${count}`;
      case 'lt':
        return Prisma.sql`COUNT(o.id) < ${count}`;
      case 'lte':
        return Prisma.sql`COUNT(o.id) <= ${count}`;
      default:
        return Prisma.sql`COUNT(o.id) >= ${count}`;
    }
  }

  private async resolveAverageTicketIds(
    criterion: Criterion,
    companyId: string,
  ): Promise<string[]> {
    const amount = Number(criterion.value);
    const operator = criterion.operator;

    const comparison =
      operator === 'gt'
        ? Prisma.sql`>`
        : operator === 'gte'
          ? Prisma.sql`>=`
          : operator === 'lt'
            ? Prisma.sql`<`
            : Prisma.sql`<=`;

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Customer" c
      INNER JOIN "Order" o ON o."customerId" = c.id
      WHERE c."companyId" = ${companyId}
      GROUP BY c.id
      HAVING AVG(o.total) ${comparison} ${amount}
    `;

    return rows.map((row) => row.id);
  }

  private parseBetween(value: unknown): [number, number] {
    if (Array.isArray(value) && value.length === 2) {
      return [Number(value[0]), Number(value[1])];
    }

    if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
      const obj = value as { min: number; max: number };
      return [Number(obj.max), Number(obj.min)];
    }

    throw new Error('Valor between deve ser um array [max, min] ou { min, max }');
  }

  private subDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() - days);
    return result;
  }
}
