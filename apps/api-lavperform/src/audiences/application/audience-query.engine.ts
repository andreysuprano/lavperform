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
    options: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 50)));
    const ids = await this.resolveCustomerIds(companyId, definition);
    const count = ids.length;
    const totalPages = count === 0 ? 0 : Math.ceil(count / limit);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const pageIds = ids.slice(offset, offset + limit);

    const rows = pageIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: pageIds } },
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

    const byId = new Map(rows.map((row) => [row.id, row]));
    const sample = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is (typeof rows)[number] => Boolean(row));

    return {
      count,
      sample,
      meta: {
        total: count,
        page: safePage,
        limit,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    };
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

    if (criterion.type === 'birthday_within_days') {
      return this.resolveBirthdayWithinDaysIds(criterion, companyId);
    }

    if (criterion.type === 'top_customers_month') {
      return this.resolveTopCustomersMonthIds(criterion, companyId);
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
      case 'phone_ddd':
        return this.buildPhoneDddWhere(criterion, companyId);
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
      return this.buildLastOrderBetweenWhere(criterion.value, companyId, now);
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

  private buildPhoneDddWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const ddds = this.parsePhoneDddValues(criterion.value);
    const prefixFilters = ddds.map((ddd) => ({
      phone: { startsWith: `55${ddd}` },
    }));

    if (criterion.operator === 'not_in') {
      return {
        companyId,
        AND: [
          { phone: { not: null } },
          { NOT: { OR: prefixFilters } },
        ],
      };
    }

    return {
      companyId,
      OR: prefixFilters,
    };
  }

  private parsePhoneDddValues(value: unknown): string[] {
    const raw = Array.isArray(value)
      ? value.map((item) => String(item).trim())
      : String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    const ddds = [...new Set(raw)];

    if (ddds.length === 0) {
      throw new Error('Informe ao menos um DDD válido');
    }

    for (const ddd of ddds) {
      if (!/^\d{2}$/.test(ddd)) {
        throw new Error(`DDD inválido: ${ddd}`);
      }
    }

    return ddds;
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

  private async resolveBirthdayWithinDaysIds(
    criterion: Criterion,
    companyId: string,
  ): Promise<string[]> {
    const days = Math.max(0, Math.floor(Number(criterion.value)));
    const monthDayPairs = this.buildUpcomingMonthDayPairs(days);

    if (monthDayPairs.length === 0) {
      return [];
    }

    const pairConditions = Prisma.join(
      monthDayPairs.map(
        ([month, day]) =>
          Prisma.sql`(EXTRACT(MONTH FROM c."birthDate") = ${month} AND EXTRACT(DAY FROM c."birthDate") = ${day})`,
      ),
      ' OR ',
    );

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Customer" c
      WHERE c."companyId" = ${companyId}
        AND c."birthDate" IS NOT NULL
        AND (${pairConditions})
    `;

    return rows.map((row) => row.id);
  }

  private async resolveTopCustomersMonthIds(
    criterion: Criterion,
    companyId: string,
  ): Promise<string[]> {
    const limit = Math.max(1, Math.floor(Number(criterion.value)));
    const { start, end } = this.getCurrentCalendarMonthRange();

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Customer" c
      INNER JOIN "Order" o ON o."customerId" = c.id
      WHERE c."companyId" = ${companyId}
        AND o."createdAt" >= ${start}
        AND o."createdAt" < ${end}
      GROUP BY c.id
      ORDER BY COUNT(o.id) DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => row.id);
  }

  private buildUpcomingMonthDayPairs(days: number): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    const seen = new Set<string>();
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);

    for (let offset = 0; offset <= days; offset++) {
      const date = new Date(cursor);
      date.setUTCDate(cursor.getUTCDate() + offset);
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const key = `${month}-${day}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([month, day]);
      }
    }

    return pairs;
  }

  private getCurrentCalendarMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }

  private buildLastOrderBetweenWhere(
    value: unknown,
    companyId: string,
    now: Date,
  ): Prisma.CustomerWhereInput {
    const dateRange = this.parseOptionalDateRange(value);
    if (dateRange) {
      return this.buildLastOrderDateRangeWhere(dateRange, companyId);
    }

    const daysRange = this.parseOptionalDaysRange(value);
    if (daysRange) {
      return this.buildLastOrderDaysRangeWhere(daysRange, companyId, now);
    }

    return { companyId, orders: { some: {} } };
  }

  private buildLastOrderDateRangeWhere(
    range: { from?: Date; toExclusive?: Date },
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const and: Prisma.CustomerWhereInput[] = [];

    if (range.from && range.toExclusive) {
      and.push({
        orders: {
          some: { createdAt: { gte: range.from, lt: range.toExclusive } },
        },
      });
      and.push({
        orders: { none: { createdAt: { gte: range.toExclusive } } },
      });
    } else if (range.from) {
      and.push({ orders: { some: { createdAt: { gte: range.from } } } });
    } else if (range.toExclusive) {
      and.push({ orders: { some: {} } });
      and.push({
        orders: { none: { createdAt: { gte: range.toExclusive } } },
      });
    } else {
      and.push({ orders: { some: {} } });
    }

    return { companyId, AND: and };
  }

  private buildLastOrderDaysRangeWhere(
    range: { min?: number; max?: number },
    companyId: string,
    now: Date,
  ): Prisma.CustomerWhereInput {
    const and: Prisma.CustomerWhereInput[] = [];

    if (range.min != null) {
      and.push({
        orders: { none: { createdAt: { gte: this.subDays(now, range.min) } } },
      });
    }

    if (range.max != null) {
      and.push({
        orders: { some: { createdAt: { gte: this.subDays(now, range.max) } } },
      });
    } else {
      and.push({ orders: { some: {} } });
    }

    return { companyId, AND: and };
  }

  private parseOptionalDateRange(
    value: unknown,
  ): { from?: Date; toExclusive?: Date } | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const obj = value as { from?: unknown; to?: unknown };
    if (!('from' in obj) && !('to' in obj)) {
      return null;
    }

    const from = this.parseDateOnly(obj.from);
    const to = this.parseDateOnly(obj.to);

    return {
      ...(from ? { from } : {}),
      ...(to ? { toExclusive: this.addUtcDays(to, 1) } : {}),
    };
  }

  private parseOptionalDaysRange(
    value: unknown,
  ): { min?: number; max?: number } | null {
    if (Array.isArray(value) && value.length === 2) {
      const max = this.parseOptionalNumber(value[0]);
      const min = this.parseOptionalNumber(value[1]);
      if (max == null && min == null) {
        return null;
      }
      return { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) };
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const obj = value as { min?: unknown; max?: unknown };
    if (!('min' in obj) && !('max' in obj)) {
      return null;
    }

    const min = this.parseOptionalNumber(obj.min);
    const max = this.parseOptionalNumber(obj.max);
    if (min == null && max == null) {
      return null;
    }

    return { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) };
  }

  private parseOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseDateOnly(value: unknown): Date | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return undefined;
    }

    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  private addUtcDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private subDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() - days);
    return result;
  }
}
