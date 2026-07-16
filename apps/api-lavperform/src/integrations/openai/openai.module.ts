import { Module } from '@nestjs/common';
import { OpenAIService } from './api/openai.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule { } 