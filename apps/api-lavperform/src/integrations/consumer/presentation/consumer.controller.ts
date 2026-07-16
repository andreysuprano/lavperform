import {
  Controller,
  Post,
  Body,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ConsumerWebhookService } from '../application/consumer-webhook.service';
import { ConsumerWebhookDto } from '../dto/consumer-webhook.dto';

@ApiTags('Consumer Integration')
@Controller('webhooks/consumer')
export class ConsumerController {
  constructor(
    private readonly consumerWebhookService: ConsumerWebhookService,
  ) {}

  @Post(':companyId')
  @ApiOperation({
    summary: 'Recebe eventos do sistema Consumer',
    description:
      'Armazena o payload recebido na fila de webhooks para processamento posterior.',
  })
  @ApiParam({ name: 'companyId', type: String, required: true })
  @ApiBody({ type: ConsumerWebhookDto })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok' } } })
  async receiveWebhook(
    @Body() body: Record<string, unknown>,
    @Param('companyId') companyId: string,
    @Res() res: Response,
  ) {
    await this.consumerWebhookService.receiveWebhook(body, companyId);
    return res.status(HttpStatus.OK).send({ status: 'ok' });
  }
}
