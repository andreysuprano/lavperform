import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { HttpModule } from '@nestjs/axios';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, WhatsappModule, AuthModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {} 