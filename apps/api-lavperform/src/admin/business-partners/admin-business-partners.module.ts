import { Module } from '@nestjs/common';
import { PartnersModule } from '../../partners/partners.module';
import { AdminBusinessPartnersController } from './admin-business-partners.controller';

@Module({
  imports: [PartnersModule],
  controllers: [AdminBusinessPartnersController],
})
export class AdminBusinessPartnersModule {}
