import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PartnerFeedService } from './partner-feed.service';

@Injectable()
export class PartnerFeedTasks {
  private readonly logger = new Logger(PartnerFeedTasks.name);

  constructor(private readonly feed: PartnerFeedService) {}

  @Cron('*/30 * * * *')
  async feedRecentSales(): Promise<void> {
    try {
      await this.feed.feedDue(new Date());
    } catch (error) {
      this.logger.error(
        'Falha ao alimentar vendas das sessões de parceiro',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
