import { Module } from '@nestjs/common';
import { LinkPageService } from './application/link-page.service';
import { LinkPageController } from './presentation/link-page.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LinkPagePrismaRepository } from './infrastructure/persistence/prisma-link-page.repository';
import { LinkPrismaRepository } from './infrastructure/persistence/prisma-link.repository';
import { GalleryPrismaRepository } from './infrastructure/persistence/prisma-gallery.repository';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule, // For ICompanyRepository
  ],
  controllers: [LinkPageController],
  providers: [
    LinkPageService,
    {
      provide: 'ILinkPageRepository',
      useClass: LinkPagePrismaRepository,
    },
    {
      provide: 'ILinkRepository',
      useClass: LinkPrismaRepository,
    },
    {
      provide: 'IGalleryRepository',
      useClass: GalleryPrismaRepository,
    },
  ],
  exports: [LinkPageService, 'ILinkPageRepository'],
})
export class LinkPageModule { }