import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DisparoProClient } from './api/disparo-pro.client';

@Module({
  imports: [HttpModule],
  providers: [DisparoProClient],
  exports: [DisparoProClient],
})
export class DisparoProModule {}
