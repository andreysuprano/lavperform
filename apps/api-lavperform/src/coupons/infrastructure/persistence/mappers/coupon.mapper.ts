import { Coupon as PrismaCoupon, Prisma } from '@prisma/client';
import { Coupon } from '../../../domain/coupon.entity';

export class CouponMapper {
    static toDomain(row: PrismaCoupon): Coupon {
        return new Coupon({
            id: row.id,
            companyId: row.companyId,
            code: row.code,
            description: row.description,
            type: row.type,
            unit: row.unit,
            value: Number(row.value),
            validUntil: row.validUntil,
            active: row.active,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            deletedAt: row.deletedAt,
        });
    }

    static toPrisma(data: Partial<Coupon>): Prisma.CouponUncheckedCreateInput | Prisma.CouponUncheckedUpdateInput {
        const prisma: Record<string, unknown> = {};
        if (data.companyId !== undefined) prisma.companyId = data.companyId;
        if (data.code !== undefined) prisma.code = data.code;
        if (data.description !== undefined) prisma.description = data.description;
        if (data.type !== undefined) prisma.type = data.type;
        if (data.unit !== undefined) prisma.unit = data.unit;
        if (data.value !== undefined) prisma.value = new Prisma.Decimal(data.value);
        if (data.validUntil !== undefined) {
            prisma.validUntil = data.validUntil instanceof Date ? data.validUntil : new Date(data.validUntil);
        }
        if (data.active !== undefined) prisma.active = data.active;
        if (data.deletedAt !== undefined) prisma.deletedAt = data.deletedAt;
        return prisma as Prisma.CouponUncheckedCreateInput;
    }
}
