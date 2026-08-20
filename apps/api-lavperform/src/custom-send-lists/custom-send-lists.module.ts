import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomSendListsController } from './presentation/custom-send-lists.controller';
import { CustomSendListsService } from './application/custom-send-lists.service';
import { CustomSendListPrismaRepository } from './infrastructure/persistence/prisma-custom-send-list.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CustomSendListsController],
  providers: [
    CustomSendListsService,
    {
      provide: 'ICustomSendListRepository',
      useClass: CustomSendListPrismaRepository,
    },
  ],
  exports: [CustomSendListsService],
})
export class CustomSendListsModule {}
