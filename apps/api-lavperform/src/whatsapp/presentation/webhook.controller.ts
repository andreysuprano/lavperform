import { Controller, Post, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConnectionUpdateEventDto } from '../application/dto/connection-update-event.dto';
import { WHATSAPP_EVENTS } from '../events/whatsapp.events';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('WhatsApp Webhook')
@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Post()
  @ApiOperation({ summary: 'Endpoint para receber eventos do WhatsApp' })
  @ApiBody({
    type: ConnectionUpdateEventDto,
    description: 'Dados do evento recebido do WhatsApp',
  })
  @ApiResponse({
    status: 204,
    description: 'Evento processado com sucesso',
  })
  async handleWebhook(
    @Body() data: ConnectionUpdateEventDto,
    @Res() res: Response,
  ) {
    if (data?.EventType === 'connection') {
      const instanceName =
        (typeof data.instance === 'object' && data.instance?.name) ||
        data.instanceName ||
        (typeof (data as any).instance === 'string' ? (data as any).instance : undefined);

      const rawStatus =
        (typeof data.instance === 'object' && data.instance?.status) ||
        (data as any).data?.state;

      const normalizedStatus = String(rawStatus ?? '').toLowerCase();
      const status =
        normalizedStatus === 'connected' || normalizedStatus === 'open'
          ? 'CONNECTED'
          : normalizedStatus === 'disconnected' || normalizedStatus === 'close'
            ? 'DISCONNECTED'
            : null;

      if (status) {
        this.eventEmitter.emit(WHATSAPP_EVENTS.CONNECTION_UPDATED, {
          instance: instanceName,
          token: data.token,
          status,
          date: new Date().toISOString(),
        });
      }
    }

    if (data?.EventType === 'messages' && 'data' in data) {
      this.logger.log(`Processando evento de mensagem recebida`);
      this.eventEmitter.emit('whatsapp.message.received', (data as any).data);
    }

    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
