import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminSuperAdminGuard } from '../auth/guards/admin-super-admin.guard';
import { AdminJwtPayload } from '../auth/interfaces/admin-jwt-payload.interface';
import { AdminDeduplicationService } from './admin-deduplication.service';
import {
  DeduplicateCampaignAttributionsDto,
  DeduplicateCustomerOrdersDto,
  KeepSeparateCustomersDto,
  MergeCustomersDto,
  ScanCustomerDuplicatesDto,
} from './dto/deduplication.dto';

@ApiTags('Admin Deduplication')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminDeduplicationController {
  constructor(private readonly service: AdminDeduplicationService) {}

  @Post('deduplication/customer-orders/preview')
  @ApiOperation({
    summary: 'Pré-visualizar pedidos duplicados de um cliente',
    description:
      'Lista grupos de pedidos duplicados (displayId + integratorOrderId) sem alterar o banco.',
  })
  previewCustomerOrders(@Body() dto: DeduplicateCustomerOrdersDto) {
    return this.service.previewCustomerOrders(dto);
  }

  @Post('deduplication/customer-orders/run')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({
    summary: 'Remover pedidos duplicados de um cliente (via fila)',
    description:
      'Enfileira a deduplicação em lotes: um job de scan enfileira jobs individuais por grupo duplicado, mantendo o pedido mais antigo.',
  })
  runCustomerOrdersDeduplication(@Body() dto: DeduplicateCustomerOrdersDto) {
    return this.service.enqueueCustomerOrdersDeduplication(dto);
  }

  @Post('deduplication/campaign-attributions/preview')
  @ApiOperation({
    summary: 'Pré-visualizar atribuições de venda duplicadas em campanha',
    description:
      'Lista pedidos com múltiplas atribuições na mesma campanha automática, sem alterar o banco.',
  })
  previewCampaignAttributions(@Body() dto: DeduplicateCampaignAttributionsDto) {
    return this.service.previewCampaignAttributions(dto);
  }

  @Post('deduplication/campaign-attributions/run')
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

  @Get('customers/duplicates')
  @ApiOperation({ summary: 'Listar grupos de clientes duplicados para revisão' })
  listCustomerDuplicates(@Query('companyId') companyId: string) {
    return this.service.previewCustomerDuplicates(companyId);
  }

  @Post('customers/duplicates/scan')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({ summary: 'Escanear e auto-mesclar duplicatas óbvias de clientes' })
  scanCustomerDuplicates(@Body() dto: ScanCustomerDuplicatesDto) {
    return this.service.enqueueCustomerDuplicatesScan(dto);
  }

  @Post('customers/merge')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({ summary: 'Mesclar cadastros duplicados em um sobrevivente' })
  mergeCustomers(
    @Body() dto: MergeCustomersDto,
    @Req() req: { user: AdminJwtPayload },
  ) {
    return this.service.mergeCustomers(dto, req.user.adminUserId);
  }

  @Post('customers/duplicates/keep-separate')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({ summary: 'Manter cadastros separados zerando o identificador compartilhado' })
  keepSeparateCustomers(
    @Body() dto: KeepSeparateCustomersDto,
    @Req() req: { user: AdminJwtPayload },
  ) {
    return this.service.keepSeparateCustomers(dto, req.user.adminUserId);
  }
}
