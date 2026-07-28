import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ClaimHelpRequestUseCase,
  DismissHelpRequestUseCase,
  ListHelpRequestsUseCase,
  ResolveHelpRequestUseCase,
} from '../../../application/customer-journey/use-cases/help-request.use-cases';
import { MarkPurchaseCompleteUseCase } from '../../../application/customer-journey/use-cases/mark-purchase-complete.use-case';
import { PurchaseCompleteDto } from '../../../application/customer-journey/dtos/purchase-complete.dto';

@ApiTags('customer-journey')
@Controller()
export class CustomerJourneyController {
  constructor(
    private readonly listHelpRequests: ListHelpRequestsUseCase,
    private readonly claimHelpRequest: ClaimHelpRequestUseCase,
    private readonly resolveHelpRequest: ResolveHelpRequestUseCase,
    private readonly dismissHelpRequest: DismissHelpRequestUseCase,
    private readonly markPurchaseComplete: MarkPurchaseCompleteUseCase,
  ) {}

  @Get('agents/:agentId/help-requests')
  @ApiOperation({ summary: 'Listar pedidos de ajuda por agente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  list(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('status') status?: string,
  ) {
    return this.listHelpRequests.execute(agentId, status ?? 'PENDING');
  }

  @Post('help-requests/:id/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atendente assume pedido de ajuda' })
  claim(@Param('id', ParseUUIDPipe) id: string) {
    return this.claimHelpRequest.execute(id);
  }

  @Post('help-requests/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver pedido de ajuda' })
  resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.resolveHelpRequest.execute(id);
  }

  @Post('help-requests/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispensar alerta de ajuda' })
  dismiss(@Param('id', ParseUUIDPipe) id: string) {
    return this.dismissHelpRequest.execute(id);
  }

  @Post('companies/:companyId/agents/:agentId/customers/purchase-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar compra efetuada e cancelar follow-ups' })
  purchaseComplete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() dto: PurchaseCompleteDto,
    @Headers('x-internal-api-key') apiKey?: string,
  ) {
    return this.markPurchaseComplete.execute({
      companyId,
      agentId,
      phone: dto.phone,
      orderId: dto.orderId,
      apiKey,
    });
  }
}
