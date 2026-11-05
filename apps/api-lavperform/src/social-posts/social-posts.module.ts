import { Module } from '@nestjs/common';
import { ImageModule } from '../integrations/image/image.module';
import { OpenRouterModule } from '../integrations/openrouter/openrouter.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialPostsController } from './social-posts.controller';
import { SocialPostsService } from './social-posts.service';

@Module({
  imports: [PrismaModule, OpenRouterModule, ImageModule],
  controllers: [SocialPostsController],
  providers: [SocialPostsService],
  exports: [SocialPostsService],
})
export class SocialPostsModule {}
