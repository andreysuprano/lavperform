import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICompanySubscriptionRepository } from '../../domain/company-subscription.repository.interface';
import { CompanySubscription } from '../../domain/company-subscription.entity';
import { CompanySubscriptionMapper } from './mappers/company-subscription.mapper';

@Injectable()
export class CompanySubscriptionPrismaRepository implements ICompanySubscriptionRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<CompanySubscription>): Promise<CompanySubscription> {
        const subscription = await this.prisma.companySubscription.create({
            data: {
                companyId: data.companyId,
                subscriptionId: data.subscriptionId,
                planId: data.planId,
            } as any,
        });
        return CompanySubscriptionMapper.toDomain(subscription);
    }

    async update(id: string, data: Partial<CompanySubscription>): Promise<CompanySubscription> {
        const subscription = await this.prisma.companySubscription.update({
            where: { id },
            data: {
                ...(data.subscriptionId !== undefined
                    ? { subscriptionId: data.subscriptionId ?? null }
                    : {}),
                ...(data.planId !== undefined ? { planId: data.planId } : {}),
            },
            include: { plan: true },
        });
        return CompanySubscriptionMapper.toDomain(subscription);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.companySubscription.delete({
            where: { id },
        });
    }

    async findAll(): Promise<CompanySubscription[]> {
        throw new Error('Method not implemented.');
    }

    async findByCompanyId(companyId: string): Promise<CompanySubscription | null> {
        const subscription = await this.prisma.companySubscription.findFirst({
            where: { companyId },
        });
        return subscription ? CompanySubscriptionMapper.toDomain(subscription) : null;
    }

    async findById(id: string): Promise<CompanySubscription | null> {
        const subscription = await this.prisma.companySubscription.findUnique({
            where: { id },
        });
        return subscription ? CompanySubscriptionMapper.toDomain(subscription) : null;
    }
}
