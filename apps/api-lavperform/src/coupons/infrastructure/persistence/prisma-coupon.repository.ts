import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICouponRepository } from '../../domain/coupon.repository.interface';
import { Coupon } from '../../domain/coupon.entity';
import { CouponMapper } from './mappers/coupon.mapper';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CouponFilterDto } from '../../application/dto/coupon-filter.dto';

@Injectable()
export class PrismaCouponRepository implements ICouponRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: Partial<Coupon>): Promise<Coupon> {
        const created = await this.prisma.coupon.create({
            data: CouponMapper.toPrisma(data) as Prisma.CouponUncheckedCreateInput,
        });
        return CouponMapper.toDomain(created);
    }

    async findById(id: string): Promise<Coupon | null> {
        const found = await this.prisma.coupon.findFirst({
            where: { id, deletedAt: null },
        });
        return found ? CouponMapper.toDomain(found) : null;
    }

    async findAll(options?: Prisma.CouponFindManyArgs): Promise<Coupon[]> {
        const rows = await this.prisma.coupon.findMany(options);
        return rows.map(CouponMapper.toDomain);
    }

    async findAllWithFilters(
        companyId: string,
        paginationDto: PaginationDto,
        filterDto: CouponFilterDto,
    ): Promise<{ items: Coupon[]; total: number }> {
        const {
            page = 1,
            limit = 10,
            orderBy = 'createdAt',
            orderDirection = 'desc',
        } = paginationDto;
        const {
            search,
            type,
            unit,
            active,
            validFrom,
            validTo,
            onlyValid,
            includeDeleted,
        } = filterDto;
        const skip = (page - 1) * limit;

        const where: Prisma.CouponWhereInput = {
            companyId,
            ...(includeDeleted ? {} : { deletedAt: null }),
            ...(active !== undefined && { active }),
            ...(type && { type }),
            ...(unit && { unit }),
            ...(search && {
                OR: [
                    { code: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...((validFrom || validTo || onlyValid) && {
                validUntil: {
                    ...(validFrom && { gte: new Date(validFrom) }),
                    ...(validTo && { lte: new Date(validTo) }),
                    ...(onlyValid && { gte: new Date() }),
                },
            }),
        };

        const [rows, total] = await Promise.all([
            this.prisma.coupon.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [orderBy]: orderDirection },
            }),
            this.prisma.coupon.count({ where }),
        ]);

        return { items: rows.map(CouponMapper.toDomain), total };
    }

    async findByCompanyAndCode(companyId: string, code: string): Promise<Coupon | null> {
        const found = await this.prisma.coupon.findUnique({
            where: {
                companyId_code: { companyId, code },
            },
        });
        return found ? CouponMapper.toDomain(found) : null;
    }

    async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
        const updated = await this.prisma.coupon.update({
            where: { id },
            data: CouponMapper.toPrisma(data) as Prisma.CouponUncheckedUpdateInput,
        });
        return CouponMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.softDelete(id);
    }

    async softDelete(id: string): Promise<Coupon> {
        const updated = await this.prisma.coupon.update({
            where: { id },
            data: { deletedAt: new Date(), active: false },
        });
        return CouponMapper.toDomain(updated);
    }

    async restore(id: string): Promise<Coupon> {
        const updated = await this.prisma.coupon.update({
            where: { id },
            data: { deletedAt: null },
        });
        return CouponMapper.toDomain(updated);
    }

    async toggleActive(id: string, companyId: string): Promise<Coupon> {
        const current = await this.prisma.coupon.findFirst({
            where: { id, companyId, deletedAt: null },
        });
        if (!current) {
            throw new Error('Coupon not found');
        }

        const updated = await this.prisma.coupon.update({
            where: { id },
            data: { active: !current.active },
        });
        return CouponMapper.toDomain(updated);
    }
}
