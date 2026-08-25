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
        return this.withSalesPeriod(this.buildRfvWhere(criterion, companyId), criterion);
      case 'last_order_days':
        return this.buildLastOrderDaysWhere(criterion, companyId);
      case 'neighborhood':
        return this.withSalesPeriod(
          this.buildAddressFieldWhere('neighborhood', criterion, companyId),
          criterion,
        );
      case 'city':
        return this.withSalesPeriod(
          this.buildAddressFieldWhere('city', criterion, companyId),
          criterion,
        );
      case 'phone_ddd':
        return this.withSalesPeriod(this.buildPhoneDddWhere(criterion, companyId), criterion);
      case 'purchased_product':
        return this.buildPurchasedProductWhere(criterion, companyId);
      case 'whatsapp_verified':
        return this.withSalesPeriod(
          {
            companyId,
            whatsappVerified: Boolean(criterion.value),
          },
          criterion,
        );
      case 'has_orders':
        return this.buildHasOrdersWhere(criterion, companyId);
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

  private buildHasOrdersWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const createdAt = this.toCreatedAtFilter(this.getPeriodRange(criterion));
    const hasOrders = Boolean(criterion.value);

    if (hasOrders) {
      return { companyId, orders: { some: createdAt ? { createdAt } : {} } };
    }

    return { companyId, orders: { none: createdAt ? { createdAt } : {} } };
  }

  private withSalesPeriod(
    where: Prisma.CustomerWhereInput,
    criterion: Criterion,
  ): Prisma.CustomerWhereInput {
    const createdAt = this.toCreatedAtFilter(this.getPeriodRange(criterion));
    if (!createdAt) {
      return where;
    }

    return {
      AND: [where, { orders: { some: { createdAt } } }],
    };
  }

  private getPeriodRange(
    criterion: Criterion,
  ): { from?: Date; toExclusive?: Date } | null {
    return this.parseOptionalDateRange(criterion.period ?? null);
  }

  private toCreatedAtFilter(
    range: { from?: Date; toExclusive?: Date } | null,
  ): Prisma.DateTimeFilter | undefined {
    if (!range || (!range.from && !range.toExclusive)) {
      return undefined;
    }

    return {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.toExclusive ? { lt: range.toExclusive } : {}),
    };
  }

  private buildOrderJoinPeriodSql(criterion: Criterion): Prisma.Sql {
    const range = this.getPeriodRange(criterion);
    if (!range) {
      return Prisma.sql``;
    }

    const parts: Prisma.Sql[] = [];
    if (range.from) {
      parts.push(Prisma.sql`AND o."createdAt" >= ${range.from}`);
    }
    if (range.toExclusive) {
      parts.push(Prisma.sql`AND o."createdAt" < ${range.toExclusive}`);
    }

    return parts.reduce((acc, part) => Prisma.sql`${acc} ${part}`, Prisma.sql``);
  }

  private buildOrderExistsPeriodSql(criterion: Criterion): Prisma.Sql {
    if (!this.getPeriodRange(criterion)) {
      return Prisma.sql``;
    }

    const periodSql = this.buildOrderJoinPeriodSql(criterion);
    return Prisma.sql`AND EXISTS (
      SELECT 1 FROM "Order" o
      WHERE o."customerId" = c.id
      ${periodSql}
    )`;
  }

  private buildLastOrderDaysWhere(
    criterion: Criterion,
    companyId: string,
  ): Prisma.CustomerWhereInput {
    const now = new Date();

    if (criterion.operator === 'between') {
      return this.buildLastOrderBetweenWhere(criterion.value, companyId, now);
    }

    const days = this.parseLastOrderDays(criterion.value);
    const dateRange = this.parseOptionalDateRange(criterion.value);
    const hasDates = Boolean(dateRange?.from || dateRange?.toExclusive);
    const and: Prisma.CustomerWhereInput[] = [];

    if (days != null) {
      and.push(...this.buildLastOrderOperatorConditions(criterion.operator, days, now));
    }

    if (hasDates && dateRange) {
      and.push(...this.buildLastOrderDateRangeConditions(dateRange));
    }

    if (and.length === 0) {
      return { companyId, orders: { some: {} } };
    }

    return { companyId, AND: and };
  }

  private buildLastOrderOperatorConditions(
    operator: Criterion['operator'],
    days: number,
    now: Date,
  ): Prisma.CustomerWhereInput[] {
    switch (operator) {
      case 'gte':
        return [{ orders: { none: { createdAt: { gte: this.subDays(now, days) } } } }];
      case 'gt':
        return [{ orders: { none: { createdAt: { gte: this.subDays(now, days + 1) } } } }];
      case 'lte':
        return [{ orders: { some: { createdAt: { gte: this.subDays(now, days) } } } }];
      case 'lt':
        return [{ orders: { some: { createdAt: { gte: this.subDays(now, days - 1) } } } }];
      case 'eq':
      default:
        return [
          { orders: { none: { createdAt: { gte: this.subDays(now, days - 1) } } } },
          { orders: { some: { createdAt: { gte: this.subDays(now, days + 1) } } } },
        ];
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
    const periodCreatedAt = this.toCreatedAtFilter(this.getPeriodRange(criterion));

    if (criterion.operator === 'ever') {
      return {
        companyId,
        orders: {
          some: {
            ...(periodCreatedAt ? { createdAt: periodCreatedAt } : {}),
            items: { some: itemFilter },
          },
        },
      };
    }

    const days = parsed.days ?? 30;
    const daysCreatedAt: Prisma.DateTimeFilter =
      criterion.operator === 'within_days'
        ? { gte: this.subDays(now, days) }
        : { gte: this.subDays(now, days) };
    const orderDateFilter = this.mergeCreatedAtFilters(daysCreatedAt, periodCreatedAt);

    if (criterion.operator === 'within_days') {
      return {
        companyId,
        orders: {
          some: {
            createdAt: orderDateFilter,
            items: { some: itemFilter },
          },
        },
      };
    }

    return {
      companyId,
      orders: {
        none: {
          createdAt: orderDateFilter,
          items: { some: itemFilter },
        },
      },
    };
  }

  private mergeCreatedAtFilters(
    base: Prisma.DateTimeFilter,
    period?: Prisma.DateTimeFilter,
  ): Prisma.DateTimeFilter {
    if (!period) {
      return base;
    }

    const gteDates = [base.gte, period.gte].filter((value): value is Date => value instanceof Date);
    const ltDates = [base.lt, period.lt].filter((value): value is Date => value instanceof Date);

    return {
      ...(gteDates.length ? { gte: new Date(Math.max(...gteDates.map((date) => date.getTime()))) } : {}),
      ...(ltDates.length ? { lt: new Date(Math.min(...ltDates.map((date) => date.getTime()))) } : {}),
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
    const periodSql = this.buildOrderJoinPeriodSql(criterion);
    const createdAt = this.toCreatedAtFilter(this.getPeriodRange(criterion));

    if (operator === 'eq' && count === 0) {
      const customers = await this.prisma.customer.findMany({
        where: { companyId, orders: { none: createdAt ? { createdAt } : {} } },
        select: { id: true },
      });
      return customers.map((c) => c.id);
    }

    const havingClause = this.buildHavingClause(operator, count);

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Order" o ON o."customerId" = c.id ${periodSql}
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
    const periodSql = this.buildOrderJoinPeriodSql(criterion);

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
      INNER JOIN "Order" o ON o."customerId" = c.id ${periodSql}
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

    const periodSql = this.buildOrderExistsPeriodSql(criterion);

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Customer" c
      WHERE c."companyId" = ${companyId}
        AND c."birthDate" IS NOT NULL
        AND (${pairConditions})
        ${periodSql}
    `;

    return rows.map((row) => row.id);
  }

  private async resolveTopCustomersMonthIds(
    criterion: Criterion,
    companyId: string,
  ): Promise<string[]> {
    const limit = Math.max(1, Math.floor(Number(criterion.value)));
    const range = this.getPeriodRange(criterion);
    const calendar = this.getCurrentCalendarMonthRange();
    const start = range?.from ?? (range?.toExclusive ? new Date(0) : calendar.start);
    const end = range?.toExclusive ?? (range?.from ? new Date(Date.UTC(9999, 11, 31)) : calendar.end);

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
    return { companyId, AND: this.buildLastOrderDateRangeConditions(range) };
  }

  private buildLastOrderDateRangeConditions(
    range: { from?: Date; toExclusive?: Date },
  ): Prisma.CustomerWhereInput[] {
    if (range.from && range.toExclusive) {
      return [
        {
          orders: {
            some: { createdAt: { gte: range.from, lt: range.toExclusive } },
          },
        },
        { orders: { none: { createdAt: { gte: range.toExclusive } } } },
      ];
    }

    if (range.from) {
      return [{ orders: { some: { createdAt: { gte: range.from } } } }];
    }

    if (range.toExclusive) {
      return [
        { orders: { some: {} } },
        { orders: { none: { createdAt: { gte: range.toExclusive } } } },
      ];
    }

    return [{ orders: { some: {} } }];
  }

  private parseLastOrderDays(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return this.parseOptionalNumber(value);
    }

    if (value && typeof value === 'object' && !Array.isArray(value) && 'days' in value) {
      return this.parseOptionalNumber((value as { days?: unknown }).days);
    }

    return undefined;
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

    if (!from && !to) {
      return null;
    }

    if (from && to && from.getTime() > to.getTime()) {
      throw new Error('Data inicial deve ser anterior ou igual à data final');
    }

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
