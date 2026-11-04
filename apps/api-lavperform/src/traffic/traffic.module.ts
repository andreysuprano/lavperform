import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyGtmContainerService } from './application/company-gtm-container.service';
import { CompanyMetaPixelService } from './application/company-meta-pixel.service';
import { TrafficReadGuard } from './presentation/traffic-read.guard';
import { TrafficTrackingController } from './presentation/traffic-tracking.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TrafficTrackingController],
  providers: [CompanyMetaPixelService, CompanyGtmContainerService, TrafficReadGuard],
  exports: [CompanyMetaPixelService, CompanyGtmContainerService],
})
export class TrafficModule {}
