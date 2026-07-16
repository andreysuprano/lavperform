import {
  Controller,
  Post,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  @Post('alloy/:companyId')
  @ApiOperation({ summary: 'Recebe Eventos do Alloy' })
  @ApiResponse({ status: 200 })
  alloyWebhook(@Res() res: Response) {
    return res.status(HttpStatus.OK).send({ status: 'ok' });
  }
}
