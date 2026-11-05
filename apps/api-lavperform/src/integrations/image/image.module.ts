import { Module } from '@nestjs/common';
import { FalQueueClient } from './fal.queue';
import { SocialImageProvider } from './social-image.provider';

@Module({
  providers: [FalQueueClient, SocialImageProvider],
  exports: [SocialImageProvider],
})
export class ImageModule {}
