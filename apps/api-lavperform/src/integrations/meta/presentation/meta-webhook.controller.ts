import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { MetaMessageStatusService } from '../application/meta-message-status.service';
import { MetaTemplateCategoryHoldService } from '../application/meta-template-category-hold.service';
import { parseMetaStatuses } from '../utils/meta-status-webhook.util';
import { parseTemplateCategoryUpdates } from '../utils/meta-template-category-webhook.util';
import { verifyMetaWebhookSignature } from '../utils/meta-webhook-signature';

@ApiExcludeController()
@Controller('webhook/meta')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly messageStatuses: MetaMessageStatusService,
    private readonly categoryHold: MetaTemplateCategoryHoldService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (
      mode === 'subscribe' &&
      token &&
      token === process.env.META_WEBHOOK_VERIFY_TOKEN
    ) {
      return challenge;
    }
    throw new UnauthorizedException('Invalid verify token');
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ): Promise<{ status: string }> {
    const secret = process.env.META_APP_SECRET;
    const rawBody =
      request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    if (!secret || !verifyMetaWebhookSignature(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    for (const update of parseTemplateCategoryUpdates(request.body)) {
      try {
        await this.categoryHold.applyByMetaTemplateId(
          update.metaTemplateId,
          update.newCategory,
        );
      } catch (error) {
        this.logger.error(
          `Falha ao aplicar categoria ${update.newCategory} do template ${update.metaTemplateId}: ${(error as Error).message}`,
        );
      }
    }

    for (const status of parseMetaStatuses(request.body)) {
      try {
        await this.messageStatuses.handle(status);
      } catch (error) {
        this.logger.error(
          `Falha ao processar status ${status.status} de ${status.metaMessageId}: ${(error as Error).message}`,
        );
      }
    }

    return { status: 'ok' };
  }
}
