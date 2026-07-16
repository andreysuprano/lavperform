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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreditsService } from '../application/credits.service';
import { CreateCreditProductDto } from '../application/dto/create-credit-product.dto';
import { UpdateCreditProductDto } from '../application/dto/update-credit-product.dto';
import { CreditProductFilterDto } from '../application/dto/credit-product-filter.dto';
import { CreateCreditTopupDto } from '../application/dto/create-credit-topup.dto';
import { CreditTopupFilterDto } from '../application/dto/credit-topup-filter.dto';
import { UpdateCreditTopupStatusDto } from '../application/dto/update-credit-topup-status.dto';
import { RecoverTopupDto } from '../application/dto/recover-topup.dto';
import { CreditLedgerFilterDto } from '../application/dto/credit-ledger-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Credits')
@Controller('credits/:companyId')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Post('products')
  @ApiOperation({ summary: 'Criar produto que consome créditos' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiBody({ type: CreateCreditProductDto })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso' })
  createProduct(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCreditProductDto,
  ) {
    return this.creditsService.createProduct(companyId, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar produtos de crédito da empresa' })
  findProducts(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditProductFilterDto,
  ) {
    return this.creditsService.findProducts(companyId, pagination, filter);
  }

  @Get('products/effective')
  @ApiOperation({
    summary: 'Listar catálogo efetivo de produtos da empresa',
  })
  findEffectiveProducts(
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

  @Get('products/:id')
  @ApiOperation({ summary: 'Buscar produto de crédito por ID' })
  findProduct(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.creditsService.findProduct(companyId, id);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Atualizar produto de crédito' })
  @ApiBody({ type: UpdateCreditProductDto })
  updateProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditProductDto,
  ) {
    return this.creditsService.updateProduct(companyId, id, dto);
  }

  @Put('products/:id/toggle-active')
  @ApiOperation({ summary: 'Ativar ou desativar produto de crédito' })
  toggleProductActive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.toggleProductActive(companyId, id);
  }

  @Put('products/:id/restore')
  @ApiOperation({ summary: 'Restaurar produto de crédito removido' })
  restoreProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.restoreProduct(companyId, id);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Remover produto de crédito' })
  removeProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.creditsService.removeProduct(companyId, id);
  }

  @Post('topups')
  @ApiOperation({ summary: 'Criar recarga de créditos e cobrança no Asaas' })
  @ApiBody({ type: CreateCreditTopupDto })
  createTopup(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCreditTopupDto,
  ) {
    return this.creditsService.createTopup(companyId, dto);
  }

  @Post('topups/recover')
  @ApiOperation({
    summary:
      'Recuperar recarga a partir de cobrança Asaas existente (pagamento órfão)',
  })
  @ApiBody({ type: RecoverTopupDto })
  @ApiResponse({
    status: 201,
    description:
      'Recarga recuperada e créditos aplicados se o pagamento estiver confirmado',
  })
  recoverTopup(
    @Param('companyId') companyId: string,
    @Body() dto: RecoverTopupDto,
  ) {
    return this.creditsService.recoverTopupFromAsaas(
      companyId,
      dto.asaasChargeId,
    );
  }

  @Get('topups')
  @ApiOperation({ summary: 'Listar recargas de créditos' })
  findTopups(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditTopupFilterDto,
  ) {
    return this.creditsService.findTopups(companyId, pagination, filter);
  }

  @Get('topups/:id')
  @ApiOperation({ summary: 'Buscar recarga de créditos por ID' })
  findTopup(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.creditsService.findTopup(companyId, id);
  }

  @Patch('topups/:id/status')
  @ApiOperation({ summary: 'Atualizar status da recarga' })
  @ApiBody({ type: UpdateCreditTopupStatusDto })
  updateTopupStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditTopupStatusDto,
  ) {
    return this.creditsService.updateTopupStatus(companyId, id, dto);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Consultar saldo de créditos da empresa' })
  getBalance(@Param('companyId') companyId: string) {
    return this.creditsService.getBalance(companyId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Consultar histórico de créditos da empresa' })
  findLedgerEntries(
    @Param('companyId') companyId: string,
    @Query() pagination: PaginationDto,
    @Query() filter: CreditLedgerFilterDto,
  ) {
    return this.creditsService.findLedgerEntries(companyId, pagination, filter);
  }
}
