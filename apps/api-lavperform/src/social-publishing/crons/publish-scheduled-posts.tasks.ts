import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SocialPublishDispatcher } from '../social-publish.dispatcher';

@Injectable()
export class PublishScheduledPostsTasks {
  private readonly logger = new Logger(PublishScheduledPostsTasks.name);

  constructor(private readonly dispatcher: SocialPublishDispatcher) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDue() {
    try {
      const count = await this.dispatcher.enqueueDue();
      if (count > 0)
        this.logger.log(`${count} post(s) enviado(s) para publicação`);
    } catch (error) {
      this.logger.error('Falha ao procurar posts no horário', error);
    }
  }
}
