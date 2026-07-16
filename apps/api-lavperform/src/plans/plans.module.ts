import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanPrismaRepository } from './infrastructure/persistence/prisma-plan.repository';
import { CompanySubscriptionPrismaRepository } from './infrastructure/persistence/prisma-company-subscription.repository';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: 'IPlanRepository',
            useClass: PlanPrismaRepository,
        },
        {
            provide: 'ICompanySubscriptionRepository',
            useClass: CompanySubscriptionPrismaRepository,
        },
    ],
    exports: ['IPlanRepository', 'ICompanySubscriptionRepository'],
})
export class PlansModule { }
