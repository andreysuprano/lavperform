import { Module } from '@nestjs/common';
import { AsaasService } from './api/asaas.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AsaasService],
  exports: [AsaasService],
})
export class AsaasModule { } 