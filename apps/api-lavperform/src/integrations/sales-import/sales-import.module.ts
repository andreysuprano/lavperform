import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SalesImportAlertService } from './sales-import-alert.service';

@Module({
  imports: [PrismaModule],
  providers: [SalesImportAlertService],
  exports: [SalesImportAlertService],
})
export class SalesImportModule {}
