import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiContext } from '../../auth/decorators/api-context.decorator';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { PublicApiContext } from '../../auth/interfaces/api-context.interface';
import { OrderIngestionService } from '../application/order-ingestion.service';
import { IngestOrderDto } from '../application/dto/ingest-order.dto';
import {
  IngestOrderAlreadyReceivedResponseDto,
  IngestOrderErrorResponseDto,
  IngestOrderQueuedResponseDto,
} from '../application/dto/ingest-order-response.dto';

const FULL_ORDER_EXAMPLE: IngestOrderDto = {
  externalOrderId: 'os-ext-12345',
  displayId: 12345,
  status: 'closed',
  orderType: 'delivery',
  orderTiming: 'instant',
  salesChannel: 'pdv',
  customerOrigin: 'whatsapp',
  merchantId: 0,
  deliveryFee: 5,
  serviceFee: 0,
  additionalFee: 0,
  total: 55.9,
  customer: {
    name: 'João Silva',
    phone: '41997269435',
    cpf: '12345678900',
    email: 'joao@exemplo.com',
  },
  deliveryAddress: {
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    zipCode: '80010-000',
    reference: 'Portaria do condomínio',
  },
  observation: 'Deixar com o porteiro',
  items: [
    {
      itemId: 100,
      name: 'Camisa social',
      quantity: 2,
      unitPrice: 25,
      totalPrice: 50,
      kind: 'item',
      status: 'confirmed',
    },
  ],
  payments: [
    {
      total: 55.9,
      paymentType: 'online',
      status: 'paid',
      paymentMethod: 'credit_card',
      paymentFee: 0,
    },
  ],
  createdAt: '2026-06-18T18:30:00.000Z',
  updatedAt: '2026-06-18T18:45:00.000Z',
};

const ORDER_WITHOUT_CPF_EXAMPLE: IngestOrderDto = {
  ...FULL_ORDER_EXAMPLE,
  externalOrderId: 'os-ext-no-cpf',
  customer: {
    name: 'Maria Souza',
    phone: '41988887777',
  },
};

const ORDER_WITHOUT_PHONE_EXAMPLE: IngestOrderDto = {
  ...FULL_ORDER_EXAMPLE,
  externalOrderId: 'os-ext-no-phone',
  customer: {
    name: 'Carlos Lima',
    cpf: '98765432100',
  },
};

const ORDER_FROM_PARTNER_EXAMPLE: IngestOrderDto = {
  ...FULL_ORDER_EXAMPLE,
  externalOrderId: 'os-ext-partner',
  partnerId: '123e4567-e89b-12d3-a456-426614174000',
  salesChannel: 'cicclo',
};

const CANCELLED_ORDER_EXAMPLE: IngestOrderDto = {
  ...FULL_ORDER_EXAMPLE,
  externalOrderId: 'os-ext-cancelled',
  status: 'cancelled',
  cancellationReason: 'Cliente desistiu',
};

@ApiTags('Ordens de serviço')
@ApiSecurity('x-api-key')
@ApiHeader({
  name: 'x-api-key',
  description: 'Chave de API',
  required: true,
})
@Controller('v1/orders')
@UseGuards(ApiKeyGuard)
export class PublicOrdersController {
  constructor(private readonly orderIngestionService: OrderIngestionService) {}

  @Post()
  @ApiOperation({
    summary: 'Inclui uma ordem de serviço da lavanderia',
    description:
      'Recebe uma ordem de serviço e enfileira para processamento assíncrono. '
  })
  @ApiBody({
    type: IngestOrderDto,
    examples: {
      complete: {
        summary: 'Ordem de serviço completa',
        value: FULL_ORDER_EXAMPLE,
      },
      withoutCpf: {
        summary: 'Ordem de serviço sem CPF',
        value: ORDER_WITHOUT_CPF_EXAMPLE,
      },
      withoutPhone: {
        summary: 'Ordem de serviço sem telefone',
        value: ORDER_WITHOUT_PHONE_EXAMPLE,
      },
      cancelled: {
        summary: 'Ordem de serviço cancelada',
        value: CANCELLED_ORDER_EXAMPLE,
      },
      fromPartner: {
        summary: 'Ordem de serviço enviada em nome de um partner',
        value: ORDER_FROM_PARTNER_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Ordem de serviço enfileirada para processamento',
    type: IngestOrderQueuedResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço já havia sido recebida anteriormente',
    type: IngestOrderAlreadyReceivedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido ou partner não encontrado',
    type: IngestOrderErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'API key ausente, inválida ou revogada',
    type: IngestOrderErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Fila de ingestão indisponível',
    type: IngestOrderErrorResponseDto,
  })
  async ingest(
    @ApiContext() ctx: PublicApiContext,
    @Body() dto: IngestOrderDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.orderIngestionService.enqueue(ctx, dto);

    if (result.status === 'already_received') {
      res.status(HttpStatus.OK);
      return result;
    }

    res.status(HttpStatus.ACCEPTED);
    return result;
  }
}
