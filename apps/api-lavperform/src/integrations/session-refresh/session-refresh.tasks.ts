import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegrationSessionService } from './integration-session.service';

@Injectable()
export class SessionRefreshTasks {
  private readonly logger = new Logger(SessionRefreshTasks.name);

  constructor(private readonly sessions: IntegrationSessionService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshDueSessions(): Promise<void> {
    try {
      await this.sessions.refreshDue(new Date());
    } catch (error) {
      this.logger.error(
        'Falha ao renovar sessões de integração',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
