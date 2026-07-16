import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConnectionUpdateEventDto } from '../application/dto/connection-update-event.dto';
import { WHATSAPP_EVENTS } from '../events/whatsapp.events';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

@ApiTags('WhatsApp Webhook')
@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly eventEmitter: EventEmitter2) { }

  @Post()
  @ApiOperation({ summary: 'Endpoint para receber eventos do WhatsApp' })
  @ApiBody({
    type: ConnectionUpdateEventDto,
    description: 'Dados do evento recebido do WhatsApp'
  })
  @ApiResponse({
    status: 204,
    description: 'Evento processado com sucesso'
  })
  async handleWebhook(
    @Body() data: ConnectionUpdateEventDto,
    @Res() res: Response,
  ) {
    // Verifica se é um evento de atualização de conexão
    if (data?.EventType === 'connection') {
      // Emite o evento interno com os dados processados
      this.eventEmitter.emit(WHATSAPP_EVENTS.CONNECTION_UPDATED, {
        instance: data.instance,
        status: data.instance.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
        date: new Date().toISOString()
      });
    }

    // Verifica se é um evento de mensagem recebida
    if (data?.EventType === 'messages' && 'data' in data) {
      this.logger.log(`Processando evento de mensagem recebida`);

      // Emite o evento interno com os dados da mensagem
      this.eventEmitter.emit('whatsapp.message.received', data.data);
    }

    // Retorna 204 No Content
    return res.status(HttpStatus.NO_CONTENT).send();
  }
} 