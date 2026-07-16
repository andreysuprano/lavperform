import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreditsService } from '../application/credits.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class AsaasWebhookController {
  constructor(private readonly creditsService: CreditsService) {}

  @Post('asaas')
  @ApiOperation({ summary: 'Recebe eventos de pagamento do Asaas' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiResponse({ status: 200 })
  async receiveAsaasWebhook(
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    await this.creditsService.receiveAsaasWebhook(body);
    return res.status(HttpStatus.OK).send({ status: 'ok' });
  }
}
