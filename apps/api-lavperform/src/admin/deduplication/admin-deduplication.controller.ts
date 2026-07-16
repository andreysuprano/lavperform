import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminSuperAdminGuard } from '../auth/guards/admin-super-admin.guard';
import { AdminDeduplicationService } from './admin-deduplication.service';
import {
  DeduplicateCampaignAttributionsDto,
  DeduplicateCustomerOrdersDto,
} from './dto/deduplication.dto';

@ApiTags('Admin Deduplication')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/deduplication')
export class AdminDeduplicationController {
  constructor(private readonly service: AdminDeduplicationService) {}

  @Post('customer-orders/preview')
  @ApiOperation({
    summary: 'Pré-visualizar pedidos duplicados de um cliente',
    description:
      'Lista grupos de pedidos duplicados (displayId + integratorOrderId) sem alterar o banco.',
  })
  previewCustomerOrders(@Body() dto: DeduplicateCustomerOrdersDto) {
    return this.service.previewCustomerOrders(dto);
  }

  @Post('customer-orders/run')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({
    summary: 'Remover pedidos duplicados de um cliente (via fila)',
    description:
      'Enfileira a deduplicação em lotes: um job de scan enfileira jobs individuais por grupo duplicado, mantendo o pedido mais antigo.',
  })
  runCustomerOrdersDeduplication(@Body() dto: DeduplicateCustomerOrdersDto) {
    return this.service.enqueueCustomerOrdersDeduplication(dto);
  }

  @Post('campaign-attributions/preview')
  @ApiOperation({
    summary: 'Pré-visualizar atribuições de venda duplicadas em campanha',
    description:
      'Lista pedidos com múltiplas atribuições na mesma campanha automática, sem alterar o banco.',
  })
  previewCampaignAttributions(@Body() dto: DeduplicateCampaignAttributionsDto) {
    return this.service.previewCampaignAttributions(dto);
  }

  @Post('campaign-attributions/run')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({
    summary: 'Remover atribuições de venda duplicadas em campanha (via fila)',
    description:
      'Enfileira a deduplicação em lotes: um job de scan enfileira jobs individuais por pedido duplicado, mantendo a atribuição mais antiga e ajustando CampaignMetric.',
  })
  runCampaignAttributionsDeduplication(
    @Body() dto: DeduplicateCampaignAttributionsDto,
  ) {
    return this.service.enqueueCampaignAttributionsDeduplication(dto);
  }
}
