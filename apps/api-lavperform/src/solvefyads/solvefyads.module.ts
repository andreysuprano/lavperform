import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SolvefyAdsService } from './solvefyads.service';
import { SolvefyAdsController } from './solvefyads.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    }),
    ConfigModule,
  ],
  controllers: [SolvefyAdsController],
  providers: [SolvefyAdsService],
  exports: [SolvefyAdsService],
})
export class SolvefyAdsModule {}
