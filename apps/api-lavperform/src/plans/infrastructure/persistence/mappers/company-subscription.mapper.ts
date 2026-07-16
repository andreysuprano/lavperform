import { CompanySubscription as PrismaCompanySubscription } from '@prisma/client';
import { CompanySubscription } from '../../../domain/company-subscription.entity';

export class CompanySubscriptionMapper {
    static toDomain(raw: PrismaCompanySubscription): CompanySubscription {
        return new CompanySubscription({
            id: raw.id,
            companyId: raw.companyId,
            subscriptionId: raw.subscriptionId ?? undefined,
            planId: raw.planId,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }
}
