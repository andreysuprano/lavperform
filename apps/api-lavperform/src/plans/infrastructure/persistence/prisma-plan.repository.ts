import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPlanRepository } from '../../domain/plan.repository.interface';
import { Plan } from '../../domain/plan.entity';
import { PlanMapper } from './mappers/plan.mapper';

@Injectable()
export class PlanPrismaRepository implements IPlanRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Plan>): Promise<Plan> {
        const plan = await this.prisma.plan.create({
            data: {
                name: data.name!,
                description: data.description!,
                price: data.price ?? 0,
                cycle: data.cycle ?? 'MONTHLY',
                recommended: data.recommended ?? false,
                maxPayments: data.maxPayments ?? 1,
                endDate: data.endDate ?? null,
                active: data.active ?? true,
                isSelfCheckout: data.isSelfCheckout ?? false,
                allowBoleto: data.allowBoleto ?? false,
                allowPix: data.allowPix ?? false,
            },
        });
        return PlanMapper.toDomain(plan);
    }

    async update(id: string, data: Partial<Plan>): Promise<Plan> {
        const plan = await this.prisma.plan.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.price !== undefined ? { price: data.price } : {}),
                ...(data.cycle !== undefined ? { cycle: data.cycle } : {}),
                ...(data.recommended !== undefined ? { recommended: data.recommended } : {}),
                ...(data.maxPayments !== undefined ? { maxPayments: data.maxPayments } : {}),
                ...(data.endDate !== undefined ? { endDate: data.endDate ?? null } : {}),
                ...(data.active !== undefined ? { active: data.active } : {}),
                ...(data.isSelfCheckout !== undefined
                    ? { isSelfCheckout: data.isSelfCheckout }
                    : {}),
                ...(data.allowBoleto !== undefined
                    ? { allowBoleto: data.allowBoleto }
                    : {}),
                ...(data.allowPix !== undefined ? { allowPix: data.allowPix } : {}),
            },
        });
        return PlanMapper.toDomain(plan);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.plan.delete({
            where: { id },
        });
    }

    async findAll(options?: {
        search?: string;
        active?: boolean;
    }): Promise<Plan[]> {
        const where: {
            active?: boolean;
            OR?: Array<{
                name?: { contains: string; mode: 'insensitive' };
                description?: { contains: string; mode: 'insensitive' };
            }>;
        } = {};

        if (options?.active !== undefined) {
            where.active = options.active;
        }

        if (options?.search?.trim()) {
            const search = options.search.trim();
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const plans = await this.prisma.plan.findMany({
            where,
            orderBy: [{ active: 'desc' }, { price: 'asc' }, { name: 'asc' }],
        });
        return plans.map(PlanMapper.toDomain);
    }

    async findActive(): Promise<Plan[]> {
        const plans = await this.prisma.plan.findMany({
            where: { active: true },
            orderBy: {
                maxPayments: 'asc',
            },
        });
        return plans.map(PlanMapper.toDomain);
    }

    async findById(id: string): Promise<Plan | null> {
        const plan = await this.prisma.plan.findUnique({
            where: { id },
        });
        return plan ? PlanMapper.toDomain(plan) : null;
    }

    async findSelfCheckoutPlan(): Promise<Plan | null> {
        const plan = await this.prisma.plan.findFirst({
            where: {
                active: true,
                isSelfCheckout: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
        return plan ? PlanMapper.toDomain(plan) : null;
    }

    async setSelfCheckoutPlan(id: string): Promise<Plan> {
        const plan = await this.prisma.$transaction(async (tx) => {
            await tx.plan.updateMany({
                where: {
                    isSelfCheckout: true,
                    id: { not: id },
                },
                data: { isSelfCheckout: false },
            });

            return tx.plan.update({
                where: { id },
                data: { isSelfCheckout: true },
            });
        });

        return PlanMapper.toDomain(plan);
    }
}
