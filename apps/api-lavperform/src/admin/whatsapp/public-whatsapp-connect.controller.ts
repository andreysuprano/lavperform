import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminWhatsappConnectionLinkService } from './admin-whatsapp-connection-link.service';

@ApiTags('WhatsApp — Conexão pública')
@Controller('public/whatsapp/connect')
export class PublicWhatsappConnectController {
  constructor(
    private readonly connectionLinkService: AdminWhatsappConnectionLinkService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Obter dados públicos da sessão de conexão' })
  @ApiParam({ name: 'token', description: 'Token público do link de conexão' })
  getSession(@Param('token') token: string) {
    return this.connectionLinkService.getPublicSession(token);
  }

  @Get(':token/connection')
  @ApiOperation({ summary: 'Obter QR Code para conexão do WhatsApp' })
  @ApiParam({ name: 'token', description: 'Token público do link de conexão' })
  getConnection(@Param('token') token: string) {
    return this.connectionLinkService.getPublicConnection(token);
  }

  @Get(':token/status')
  @ApiOperation({ summary: 'Consultar status da conexão do WhatsApp' })
  @ApiParam({ name: 'token', description: 'Token público do link de conexão' })
  @ApiResponse({ status: 200, description: 'Status atual da instância' })
  getStatus(@Param('token') token: string) {
    return this.connectionLinkService.getPublicStatus(token);
  }
}
