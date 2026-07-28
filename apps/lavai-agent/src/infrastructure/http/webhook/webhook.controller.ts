import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReceiveWebhookUseCase } from '../../../application/webhook/use-cases/receive-webhook.use-case';

@ApiTags('webhook')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly receiveWebhook: ReceiveWebhookUseCase) {}

  @Post(':companyId/:agentId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Recebe evento da UAZAPI para um agente específico',
    description:
      'O companyId identifica a empresa (tenant) e o agentId identifica o agente de IA que deve processar o evento. Configure esta URL no painel da UAZAPI como webhook da instância.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'UUID da empresa (tenant)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'agentId',
    description: 'UUID do agente de IA vinculado à instância UAZAPI',
    example: '789e0123-e89b-12d3-a456-426614174999',
  })
  @ApiBody({
    description: 'Evento UAZAPI (JSON arbitrário)',
    schema: {
      type: 'object',
      additionalProperties: true,
      example: { event: 'message', data: { from: '5511999999999', body: 'Oi' } },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Evento persistido e enfileirado para processamento',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        webhookEventId: { type: 'string' },
        companyId: { type: 'string' },
        agentId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async handle(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ jobId: string; webhookEventId: string; companyId: string; agentId: string; message: string }> {
    const rawPayload = JSON.stringify(body);
    const payloadSize = Buffer.byteLength(rawPayload, 'utf8');
    const eventType = (body?.event as string) ?? (body?.type as string) ?? 'desconhecido';

    this.logger.log(
      `[WEBHOOK] POST recebido | companyId=${companyId} | agentId=${agentId} | event="${eventType}" | payload=${payloadSize}b`,
    );
    this.logger.debug(`[WEBHOOK] Payload completo: ${rawPayload.slice(0, 500)}${rawPayload.length > 500 ? '...' : ''}`);

    try {
      const { jobId, webhookEventId } = await this.receiveWebhook.execute(rawPayload, companyId, agentId);

      this.logger.log(
        `[WEBHOOK] Evento persistido e enfileirado | webhookEventId=${webhookEventId} | jobId=${jobId}`,
      );

      return {
        jobId,
        webhookEventId,
        companyId,
        agentId,
        message: 'Evento recebido, persistido e enfileirado para processamento.',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[WEBHOOK] Falha ao processar entrada | companyId=${companyId} | agentId=${agentId} | erro=${msg}`,
      );
      throw error;
    }
  }
}
