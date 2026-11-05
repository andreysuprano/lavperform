import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';

import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialPublishDispatcher {
  private readonly logger = new Logger(SocialPublishDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.SOCIAL_POST_PUBLISH) private readonly queue: Queue,
  ) {}

  async enqueueDue() {
    const due = await this.prisma.scheduledSocialPost.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });
    for (const post of due) {
      await this.enqueue(post.id);
    }
    return due.length;
  }

  async enqueue(postId: string): Promise<{ queued: boolean }> {
    const claimed = await this.prisma.scheduledSocialPost.updateMany({
      where: { id: postId, status: 'SCHEDULED' },
      data: { status: 'PUBLISHING' },
    });
    if (claimed.count === 0) return { queued: false };
    try {
      await this.queue.add(
        'publish',
        { postId },
        {
          jobId: `social-publish-${postId}-${Date.now()}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: true,
        },
      );
      return { queued: true };
    } catch (error) {
      this.logger.error(`Fila indisponível para o post ${postId}`, error);
      await this.prisma.scheduledSocialPost.update({
        where: { id: postId },
        data: {
          status: 'SCHEDULED',
          lastError:
            'A fila de publicação está indisponível. Vamos tentar de novo.',
        },
      });
      return { queued: false };
    }
  }
}
