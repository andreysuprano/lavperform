import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { ScheduledPostsService } from '../scheduled-posts.service';

@Processor(QUEUE_NAMES.SOCIAL_POST_PUBLISH)
export class PublishScheduledPostsProcessor {
  private readonly logger = new Logger(PublishScheduledPostsProcessor.name);

  constructor(private readonly posts: ScheduledPostsService) {}

  @Process('publish')
  async handle(job: Job<{ postId: string }>) {
    const maxAttempts = job.opts.attempts ?? 3;
    const attempt = job.attemptsMade + 1;
    this.logger.log(
      `Publicando post ${job.data.postId} tentativa ${attempt}/${maxAttempts}`,
    );
    await this.posts.runAttempt(job.data.postId, attempt, maxAttempts);
  }
}
