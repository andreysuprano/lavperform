import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnerPrismaRepository } from './infrastructure/persistence/prisma-partner.repository';
import { BusinessPartnerPrismaRepository } from './infrastructure/persistence/prisma-business-partner.repository';
import { DigitalMenuIntegrationPrismaRepository } from './infrastructure/persistence/prisma-digital-menu-integration.repository';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: 'IPartnerRepository',
            useClass: PartnerPrismaRepository,
        },
        {
            provide: 'IBusinessPartnerRepository',
            useClass: BusinessPartnerPrismaRepository,
        },
        {
            provide: 'IDigitalMenuIntegrationRepository',
            useClass: DigitalMenuIntegrationPrismaRepository,
        },
    ],
    exports: [
        'IPartnerRepository',
        'IBusinessPartnerRepository',
        'IDigitalMenuIntegrationRepository',
    ],
})
export class PartnersModule { }
