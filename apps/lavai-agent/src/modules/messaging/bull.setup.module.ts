import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { WEBHOOK_QUEUE_NAME } from '../../infrastructure/queue/webhook-queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: new IORedis(config.getOrThrow<string>('REDIS_URL'), {
          maxRetriesPerRequest: null,
        }),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: WEBHOOK_QUEUE_NAME }),
  ],
  exports: [BullModule],
})
export class BullSetupModule {}
