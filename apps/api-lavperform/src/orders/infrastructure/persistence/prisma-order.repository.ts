import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IOrderRepository } from '../../domain/order.repository.interface';
import { Order } from '../../domain/order.entity';
import { OrderMapper } from './mappers/order.mapper';
import { OrderFilterDto } from '../../application/dto/order-filter.dto';
import { resolveCreatedAtFilter } from '../../application/order-created-at.filter';
import { MonthlySalesItemDto, TodaySalesSummary } from '../../application/dto/monthly-sales-history.dto';

type MonthlyRaw = {
    month: Date;
    count: bigint;
    total_value: string;
};

function safeOrderInt(value: unknown, fallback: number): number {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}

function safeOrderDecimal(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/** Evita `undefined` no payload   Prisma 7 / adapter pode falhar e mascarar com erros genéricos. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined),
    );
}

function pickDeliveryAddressCreate(addr: Record<string, unknown> | undefined): Record<string, string> | null {
    if (!addr) return null;
    const keys = [
        'street',
        'number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'zipCode',
        'reference',
    ] as const;
    const out: Record<string, string> = {};
    for (const k of keys) {
        const v = addr[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
            out[k] = String(v).trim();
        }
    }
    return Object.keys(out).length > 0 ? out : null;
}

const ORDER_CREATE_SCALAR_KEYS = new Set([
    'integratorOrderId',
    'externalOrderId',
    'displayId',
    'merchantId',
    'status',
    'orderType',
    'orderTiming',
    'salesChannel',
    'customerOrigin',
    'tableNumber',
    'estimatedTime',
    'cancellationReason',
    'fiscalDocument',
    'observation',
    'deliveryFee',
    'serviceFee',
    'additionalFee',
    'total',
    'createdAt',
    'updatedAt',
    'digitalMenuIntegrationId',
    'partnerId',
    'companyId',
    'customerId',
]);

@Injectable()
export class OrderPrismaRepository implements IOrderRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Order>): Promise<Order> {
        // Basic create not fully implemented as we use createWithRelations mostly
        // Falling back to a simple create if ever needed for direct data dump
        const created = await this.prisma.order.create({ data: data as any });
        return OrderMapper.toDomain(created as any);
    }

    async createWithRelations(orderData: any): Promise<Order> {
        const {
            items,
            discounts,
            payments,
            deliveryAddress,
            schedule,
            customer, // Remove generic customer if present to avoid prisma error if it's an object
            ...orderFields
        } = orderData;

        const pickOrderScalars = (fields: Record<string, unknown>) => {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(fields)) {
                if (ORDER_CREATE_SCALAR_KEYS.has(key) && fields[key] !== undefined) {
                    out[key] = fields[key];
                }
            }
            return out;
        };

        const mapOptionCreates = (options: any[]) =>
            options.map((option: any) =>
                omitUndefined({
                    optionId: safeOrderInt(option.optionId, 0),
                    externalCode:
                        option.externalCode != null &&
                        String(option.externalCode).trim() !== ''
                            ? String(option.externalCode).trim()
                            : null,
                    name: String(option.name ?? ''),
                    quantity: Math.max(1, safeOrderInt(option.quantity, 1)),
                    unitPrice: safeOrderDecimal(option.unitPrice),
                    optionGroupId: safeOrderInt(option.optionGroupId, 0),
                    optionGroupName: String(option.optionGroupName ?? ''),
                }),
            );

        /**
         * Prisma 7 + nested `OrderItem.items.create` exige `order` em alguns casos e quebra com
         * `Argument order is missing`. Criamos linhas em transação: order → cada item com orderId + parentItemId.
         */
        const createOrderItemRecursive = async (
            tx: any,
            item: any,
            orderId: string,
            parentItemId: string | null,
        ): Promise<void> => {
            const { items: childDtos, options, parentItemId: _p, orderId: _o, ...raw } = item;

            const data: Record<string, unknown> = omitUndefined({
                orderId,
                parentItemId: parentItemId ?? undefined,
                itemId: safeOrderInt(raw.itemId, 0),
                name: String(raw.name ?? ''),
                quantity: Math.max(1, safeOrderInt(raw.quantity, 1)),
                unitPrice: safeOrderDecimal(raw.unitPrice),
                totalPrice: safeOrderDecimal(raw.totalPrice),
                kind: String(raw.kind ?? 'item'),
                status: String(raw.status ?? 'confirmed'),
                externalCode:
                    raw.externalCode !== undefined &&
                    raw.externalCode !== null &&
                    String(raw.externalCode).trim() !== ''
                        ? String(raw.externalCode).trim()
                        : undefined,
                observation:
                    typeof raw.observation === 'string' && raw.observation.trim() !== ''
                        ? raw.observation.trim()
                        : undefined,
            });

            if (Array.isArray(options) && options.length > 0) {
                data.options = { create: mapOptionCreates(options) };
            }

            const created = await tx.orderItem.create({ data: data as any });
            const children = Array.isArray(childDtos) ? childDtos : [];
            for (const child of children) {
                await createOrderItemRecursive(tx, child, orderId, created.id);
            }
        };

        const orderScalars = pickOrderScalars(orderFields as Record<string, unknown>);
        const addressPayload = pickDeliveryAddressCreate(deliveryAddress);

        const orderInclude = {
            customer: { include: { address: true } },
            company: true,
            items: {
                include: {
                    options: true,
                    items: {
                        include: {
                            options: true,
                            items: true,
                        },
                    },
                },
            },
            discounts: true,
            payments: true,
            deliveryAddress: true,
            schedule: true,
        };

        const created = await this.prisma.$transaction(async (tx) => {
            const orderCreateData: Record<string, unknown> = { ...orderScalars };

            if (addressPayload) {
                orderCreateData.deliveryAddress = { create: addressPayload };
            }

            if (
                schedule &&
                schedule.deliveryDateRaw != null &&
                String(schedule.deliveryDateRaw).trim() !== '' &&
                schedule.deliveryTimeRaw != null &&
                String(schedule.deliveryTimeRaw).trim() !== ''
            ) {
                orderCreateData.schedule = {
                    create: omitUndefined({
                        deliveryDateRaw: schedule.deliveryDateRaw,
                        deliveryTimeRaw: schedule.deliveryTimeRaw,
                        deliveryAt: schedule.deliveryAt,
                    }) as Record<string, unknown>,
                };
            }

            if (discounts && discounts.length > 0) {
                orderCreateData.discounts = {
                    create: discounts.map((discount: any) =>
                        omitUndefined({
                            type: discount.type,
                            value: discount.value,
                            description: discount.description,
                        }),
                    ),
                };
            }

            if (payments && payments.length > 0) {
                orderCreateData.payments = {
                    create: payments.map((payment: any) => {
                        const paymentType =
                            String(payment.paymentType ?? '').trim() || 'unknown';
                        const paymentMethod =
                            String(payment.paymentMethod ?? '').trim() || paymentType;
                        return omitUndefined({
                            total: payment.total,
                            paymentType,
                            paymentMethod,
                            changeFor: payment.changeFor,
                            status: payment.status,
                            cardNumber: payment.cardNumber,
                            cardBrand: payment.cardBrand,
                            observation: payment.observation,
                            paymentFee: payment.paymentFee,
                        });
                    }),
                };
            }

            const order = await tx.order.create({
                data: orderCreateData as any,
            });

            if (items && items.length > 0) {
                for (const root of items) {
                    await createOrderItemRecursive(tx, root, order.id, null);
                }
            }

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: orderInclude as any,
            });
        }, {
            maxWait: 10_000,
            timeout: 60_000,
        });

        return OrderMapper.toDomain(created as any);
    }

    async findByIntegratorOrderId(companyId: string, integratorOrderId: number): Promise<Order | null> {
        const result = await this.prisma.order.findFirst({
            where: {
                companyId,
                integratorOrderId
            },
            include: {
                items: true,
                discounts: true,
                payments: true
            }
        });

        return result ? OrderMapper.toDomain(result as any) : null;
    }

    async findByExternalOrderId(companyId: string, externalOrderId: string): Promise<Order | null> {
        const result = await this.prisma.order.findFirst({
            where: {
                companyId,
                externalOrderId,
            },
            include: {
                items: true,
                discounts: true,
                payments: true,
            },
        });

        return result ? OrderMapper.toDomain(result as any) : null;
    }

    async findByCustomerId(customerId: string, options?: OrderFilterDto): Promise<{ items: Order[]; total: number }> {
        const { page = 1, limit = 10, status, startDate, endDate } = options || {};
        const skip = (page - 1) * limit;

        const whereClause: any = {
            customerId,
        };

        if (status) whereClause.status = status;
        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: whereClause,
                include: {
                    items: true,
                    discounts: true,
                    payments: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.order.count({
                where: whereClause,
            }),
        ]);

        return {
            items: orders.map(o => OrderMapper.toDomain(o as any)),
            total
        };
    }

    async findByCompanyId(companyId: string, options?: OrderFilterDto): Promise<{ items: Order[]; total: number }> {
        const { page = 1, limit = 10, status, startDate, endDate, customerId, period } = options || {};
        const skip = (page - 1) * limit;

        const whereClause: any = {
            companyId,
        };

        if (customerId) whereClause.customerId = customerId;
        if (status) whereClause.status = status;

        let todayStart: Date | undefined;
        let todayEnd: Date | undefined;

        if (period === 'today') {
            const bounds = await this.prisma.$queryRaw<[{ start: Date; end: Date }]>(
                Prisma.sql`
                    SELECT
                        DATE_TRUNC('day', NOW()) AS start,
                        DATE_TRUNC('day', NOW()) + INTERVAL '1 day' AS end
                `,
            );
            todayStart = bounds[0].start;
            todayEnd = bounds[0].end;
        }

        const createdAt = resolveCreatedAtFilter({
            period,
            startDate,
            endDate,
            todayStart,
            todayEnd,
        });

        if (createdAt) {
            whereClause.createdAt = createdAt;
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: whereClause,
                include: {
                    customer: { include: { address: true } },
                    items: true,
                    discounts: true,
                    payments: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.order.count({
                where: whereClause,
            }),
        ]);

        return {
            items: orders.map(o => OrderMapper.toDomain(o as any)),
            total
        };
    }

    async update(id: string, data: Partial<Order>): Promise<Order> {
        const updated = await this.prisma.order.update({
            where: { id },
            data: data as any,
            include: {
                items: true,
                discounts: true,
                payments: true
            }
        });
        return OrderMapper.toDomain(updated as any);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.order.delete({ where: { id } });
    }

    async findById(id: string): Promise<Order | null> {
        const result = await this.prisma.order.findUnique({
            where: { id },
            include: {
                customer: { include: { address: true } },
                items: { include: { options: true } },
                discounts: true,
                payments: true,
                deliveryAddress: true,
                schedule: true
            }
        });
        return result ? OrderMapper.toDomain(result as any) : null;
    }

    async findAll(options?: any): Promise<Order[] | { items: Order[]; total: number; }> {
        // Basic implementation for interface compliance
        return [];
    }

    async count(options?: any): Promise<number> {
        return this.prisma.order.count({ where: options });
    }

    async getTotalOrdersValueByCustomer(customerId: string): Promise<number | string> {
        return Number(this.prisma.order.aggregate({
            where: { customerId },
            _sum: { total: true }
        }).then(result => result._sum.total || 0));
    }

    async getTodaySales(companyId: string): Promise<TodaySalesSummary> {
        const result = await this.prisma.$queryRaw<[{ count: bigint; total_value: string; cycle_count: bigint }]>(
            Prisma.sql`
                SELECT
                    COUNT(*)::bigint AS count,
                    COALESCE(SUM(o."total"), 0) AS total_value,
                    COALESCE((
                        SELECT SUM(oi."quantity")
                        FROM "OrderItem" oi
                        INNER JOIN "Order" cycle_order ON cycle_order.id = oi."orderId"
                        WHERE cycle_order."companyId" = ${companyId}
                          AND cycle_order."createdAt" >= DATE_TRUNC('day', NOW())
                          AND cycle_order."createdAt" < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
                          AND oi."parentItemId" IS NULL
                    ), 0)::bigint AS cycle_count
                FROM "Order" o
                WHERE o."companyId" = ${companyId}
                  AND o."createdAt" >= DATE_TRUNC('day', NOW())
                  AND o."createdAt" < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';
            `,
        );

        return {
            count: Number(result[0].count),
            totalValue: Number(result[0].total_value),
            cycleCount: Number(result[0].cycle_count),
        };
    }

    async getMonthlySalesHistory(companyId: string): Promise<MonthlySalesItemDto[]> {
        const rows = await this.prisma.$queryRaw<MonthlyRaw[]>(
            Prisma.sql`
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
                        DATE_TRUNC('month', NOW()),
                        INTERVAL '1 month'
                    )::date AS month
                ),
                monthly_stats AS (
                    SELECT
                        DATE_TRUNC('month', "createdAt")::date AS month,
                        COUNT(*)::bigint                        AS count,
                        COALESCE(SUM("total"), 0)              AS total_value
                    FROM "Order"
                    WHERE "companyId" = ${companyId}
                      AND "createdAt" >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
                      AND "createdAt" <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
                    GROUP BY 1
                )
                SELECT
                    m.month,
                    COALESCE(s.count, 0)       AS count,
                    COALESCE(s.total_value, 0) AS total_value
                FROM months m
                LEFT JOIN monthly_stats s USING (month)
                ORDER BY m.month ASC;
            `,
        );

        return rows.map(row => {
            const month = new Date(row.month)
                .toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' })
                .replace('.', '')
                .replace(/^\w/, c => c.toUpperCase());

            return {
                month,
                count: Number(row.count),
                totalValue: Number(row.total_value),
            };
        });
    }
}
