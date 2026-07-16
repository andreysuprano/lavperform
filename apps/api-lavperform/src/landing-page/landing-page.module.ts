import { Module } from '@nestjs/common';
import { LandingPageService } from './application/landing-page.service';
import { LandingPageController } from './presentation/landing-page.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LandingPagePrismaRepository } from './infrastructure/persistence/prisma-landing-page.repository';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [
        PrismaModule,
        CompaniesModule, // Para ICompanyRepository
    ],
    controllers: [LandingPageController],
    providers: [
        LandingPageService,
        {
            provide: 'ILandingPageRepository',
            useClass: LandingPagePrismaRepository,
        },
    ],
    exports: [LandingPageService, 'ILandingPageRepository'],
})
export class LandingPageModule { }
