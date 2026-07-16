import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreditsService } from '../../credits/application/credits.service';
import { CreateCreditProductDto } from '../../credits/application/dto/create-credit-product.dto';
import { CreateCreditTopupDto } from '../../credits/application/dto/create-credit-topup.dto';
import { CreateCreditGrantDto } from '../../credits/application/dto/create-credit-grant.dto';
import { CreditLedgerFilterDto } from '../../credits/application/dto/credit-ledger-filter.dto';
import { CreditProductFilterDto } from '../../credits/application/dto/credit-product-filter.dto';
import { CreditTopupFilterDto } from '../../credits/application/dto/credit-topup-filter.dto';
import { RecoverTopupDto } from '../../credits/application/dto/recover-topup.dto';
import { UpdateCreditProductDto } from '../../credits/application/dto/update-credit-product.dto';
import { UpdateCreditTopupStatusDto } from '../../credits/application/dto/update-credit-topup-status.dto';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminSuperAdminGuard } from '../auth/guards/admin-super-admin.guard';
import type { AdminJwtPayload } from '../auth/interfaces/admin-jwt-payload.interface';
import { AdminBillingService } from './admin-billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CreateBillingPaymentDto } from './dto/create-billing-payment.dto';
import { ProvisionSubscriptionDto } from './dto/provision-subscription.dto';
import { ReceiveInCashDto } from './dto/receive-in-cash.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UpdateSubscriptionStatusDto } from './dto/update-subscription-status.dto';

@ApiTags('Admin Company Billing')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/companies/:companyId/billing')
export class AdminCompanyBillingController {
  constructor(
    private readonly adminBillingService: AdminBillingService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Consultar assinatura da empresa (interno + Asaas)' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  getSubscription(@Param('companyId') companyId: string) {
    return this.adminBillingService.getSubscription(companyId);
  }

  @Get('subscription/payments')
  @ApiOperation({ summary: 'Listar cobranças da assinatura no Asaas' })
  getSubscriptionPayments(@Param('companyId') companyId: string) {
    return this.adminBillingService.getSubscriptionPayments(companyId);
  }

  @Get('subscription/payments/:paymentId')
  @ApiOperation({ summary: 'Detalhe da cobrança com boleto/Pix' })
  getSubscriptionPayment(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.adminBillingService.getSubscriptionPaymentDetails(
      companyId,
      paymentId,
    );
  }

  @Patch('subscription')
  @ApiOperation({ summary: 'Trocar plano e/ou valores da assinatura' })
  @ApiBody({ type: ChangePlanDto })
  changePlan(
    @Param('companyId') companyId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.adminBillingService.changePlan(companyId, dto);
  }

  @Patch('subscription/status')
  @ApiOperation({ summary: 'Suspender ou reativar assinatura no Asaas' })
  @ApiBody({ type: UpdateSubscriptionStatusDto })
  updateSubscriptionStatus(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    return this.adminBillingService.updateSubscriptionStatus(companyId, dto);
  }

  @Post('subscription/provision')
  @ApiOperation({ summary: 'Criar cliente e assinatura no Asaas para empresa legada' })
  @ApiBody({ type: ProvisionSubscriptionDto })
  provisionSubscription(
    @Param('companyId') companyId: string,
    @Body() dto: ProvisionSubscriptionDto,
  ) {
    return this.adminBillingService.provisionSubscription(companyId, dto);
  }

  @Delete('subscription')
  @ApiOperation({ summary: 'Remover assinatura no Asaas' })
  deleteSubscription(@Param('companyId') companyId: string) {
    return this.adminBillingService.deleteCompanySubscription(companyId);
  }

  @Post('subscription/payments')
  @ApiOperation({ summary: 'Criar cobrança avulsa para o cliente Asaas da empresa' })
  @ApiBody({ type: CreateBillingPaymentDto })
  createPayment(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBillingPaymentDto,
  ) {
    return this.adminBillingService.createStandalonePayment(companyId, dto);
  }

  @Post('subscription/payments/:paymentId/receive-in-cash')
  @ApiOperation({ summary: 'Confirmar recebimento em dinheiro de cobrança da assinatura' })
  @ApiBody({ type: ReceiveInCashDto })
  receivePaymentInCash(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: ReceiveInCashDto,
  ) {
    return this.adminBillingService.receiveSubscriptionPaymentInCash(
      companyId,
      paymentId,
      dto,
    );
  }

  @Delete('subscription/payments/:paymentId')
  @ApiOperation({ summary: 'Excluir cobrança pendente da assinatura' })
  deletePayment(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.adminBillingService.deleteSubscriptionPayment(
      companyId,
      paymentId,
    );
  }

  @Post('subscription/payments/:paymentId/refund')
  @ApiOperation({ summary: 'Estornar cobrança paga da assinatura' })
  @ApiBody({ type: RefundPaymentDto })
  refundPayment(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.adminBillingService.refundSubscriptionPayment(
      companyId,
      paymentId,
      dto,
    );
  }

  @Post('credits/products')
  @ApiOperation({ summary: 'Criar produto de crédito da empresa' })
  createCreditProduct(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCreditProductDto,
  ) {
    return this.creditsService.createProduct(companyId, dto);
  }

  @Get('credits/products')
  @ApiOperation({ summary: 'Listar produtos de crédito da empresa' })
  findCreditProducts(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditProductFilterDto,
  ) {
    return this.creditsService.findProducts(companyId, pagination, filter);
  }

  @Get('credits/products/effective')
  @ApiOperation({ summary: 'Listar catálogo efetivo de produtos da empresa' })
  findEffectiveCreditProducts(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditProductFilterDto,
  ) {
    return this.creditsService.findEffectiveProducts(
      companyId,
      pagination,
      filter,
    );
  }

  @Get('credits/products/:id')
  @ApiOperation({ summary: 'Buscar produto de crédito por ID' })
  findCreditProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.findProduct(companyId, id);
  }

  @Put('credits/products/:id')
  @ApiOperation({ summary: 'Atualizar produto de crédito' })
  updateCreditProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditProductDto,
  ) {
    return this.creditsService.updateProduct(companyId, id, dto);
  }

  @Put('credits/products/:id/toggle-active')
  @ApiOperation({ summary: 'Ativar ou desativar produto de crédito' })
  toggleCreditProductActive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.toggleProductActive(companyId, id);
  }

  @Put('credits/products/:id/restore')
  @ApiOperation({ summary: 'Restaurar produto de crédito removido' })
  restoreCreditProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.restoreProduct(companyId, id);
  }

  @Delete('credits/products/:id')
  @ApiOperation({ summary: 'Remover produto de crédito' })
  removeCreditProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.removeProduct(companyId, id);
  }

  @Post('credits/topups')
  @ApiOperation({ summary: 'Criar recarga de créditos e cobrança no Asaas' })
  createTopup(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCreditTopupDto,
  ) {
    return this.creditsService.createTopup(companyId, dto);
  }

  @Post('credits/grants')
  @UseGuards(AdminSuperAdminGuard)
  @ApiOperation({
    summary: 'Conceder créditos da plataforma sem cobrança (voucher)',
  })
  @ApiBody({ type: CreateCreditGrantDto })
  grantPlatformCredits(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCreditGrantDto,
    @Req() req: { user: AdminJwtPayload },
  ) {
    return this.creditsService.grantPlatformCredits(companyId, dto, {
      adminUserId: req.user.adminUserId,
      adminUserName: req.user.adminUserName,
    });
  }

  @Post('credits/topups/recover')
  @ApiOperation({ summary: 'Recuperar recarga a partir de cobrança Asaas existente' })
  recoverTopup(
    @Param('companyId') companyId: string,
    @Body() dto: RecoverTopupDto,
  ) {
    return this.creditsService.recoverTopupFromAsaas(
      companyId,
      dto.asaasChargeId,
    );
  }

  @Get('credits/topups')
  @ApiOperation({ summary: 'Listar recargas de créditos' })
  findTopups(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditTopupFilterDto,
  ) {
    return this.creditsService.findTopups(companyId, pagination, filter);
  }

  @Get('credits/topups/:id')
  @ApiOperation({ summary: 'Buscar recarga de créditos por ID' })
  findTopup(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.findTopup(companyId, id);
  }

  @Patch('credits/topups/:id/status')
  @ApiOperation({ summary: 'Atualizar status da recarga manualmente' })
  updateTopupStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditTopupStatusDto,
  ) {
    return this.creditsService.updateTopupStatus(companyId, id, dto);
  }

  @Post('credits/topups/:id/receive-in-cash')
  @ApiOperation({ summary: 'Baixa em dinheiro no Asaas e sincroniza recarga' })
  @ApiBody({ type: ReceiveInCashDto })
  receiveTopupInCash(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ReceiveInCashDto,
  ) {
    return this.adminBillingService.receiveTopupInCash(companyId, id, dto);
  }

  @Post('credits/topups/:id/sync-asaas')
  @ApiOperation({ summary: 'Reconciliar status da recarga com o Asaas' })
  syncTopupFromAsaas(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.adminBillingService.syncTopupFromAsaas(companyId, id);
  }

  @Delete('credits/topups/:id/asaas-charge')
  @ApiOperation({ summary: 'Excluir cobrança Asaas da recarga pendente' })
  deleteTopupAsaasCharge(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.adminBillingService.deleteTopupAsaasCharge(companyId, id);
  }

  @Get('credits/balance')
  @ApiOperation({ summary: 'Consultar saldo de créditos da empresa' })
  getCreditBalance(@Param('companyId') companyId: string) {
    return this.creditsService.getBalance(companyId);
  }

  @Get('credits/ledger')
  @ApiOperation({ summary: 'Consultar histórico de créditos da empresa' })
  findCreditLedger(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditLedgerFilterDto,
  ) {
    return this.creditsService.findLedgerEntries(companyId, pagination, filter);
  }
}
