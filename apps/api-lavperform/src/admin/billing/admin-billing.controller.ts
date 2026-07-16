import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreditsService } from '../../credits/application/credits.service';
import { CreateCreditProductDto } from '../../credits/application/dto/create-credit-product.dto';
import { CreditProductFilterDto } from '../../credits/application/dto/credit-product-filter.dto';
import { UpdateCreditProductDto } from '../../credits/application/dto/update-credit-product.dto';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminBillingService } from './admin-billing.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanFilterDto } from './dto/plan-filter.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private readonly adminBillingService: AdminBillingService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planos de assinatura' })
  findPlans(@Query() filter: PlanFilterDto) {
    if (filter.includeInactive || filter.search || filter.active !== undefined) {
      return this.adminBillingService.findAllPlans(filter);
    }
    return this.adminBillingService.findActivePlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Criar plano de assinatura' })
  @ApiBody({ type: CreatePlanDto })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminBillingService.createPlan(dto);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Buscar plano por ID' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  findPlan(@Param('id') id: string) {
    return this.adminBillingService.findPlanById(id);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Atualizar plano de assinatura' })
  @ApiBody({ type: UpdatePlanDto })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminBillingService.updatePlan(id, dto);
  }

  @Put('plans/:id/toggle-active')
  @ApiOperation({ summary: 'Ativar ou desativar plano de assinatura' })
  togglePlanActive(@Param('id') id: string) {
    return this.adminBillingService.togglePlanActive(id);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Remover plano de assinatura' })
  removePlan(@Param('id') id: string) {
    return this.adminBillingService.deletePlan(id);
  }

  @Post('credits/default-products')
  @ApiOperation({ summary: 'Criar oferta default de produto de crédito' })
  @ApiBody({ type: CreateCreditProductDto })
  createDefaultProduct(@Body() dto: CreateCreditProductDto) {
    return this.creditsService.createDefaultProduct(dto);
  }

  @Get('credits/default-products')
  @ApiOperation({ summary: 'Listar ofertas default de produtos de crédito' })
  findDefaultProducts(@Query() filter: CreditProductFilterDto) {
    return this.creditsService.findDefaultProducts(filter);
  }

  @Get('credits/default-products/:id')
  @ApiOperation({ summary: 'Buscar oferta default por ID' })
  @ApiParam({ name: 'id', description: 'ID da oferta default' })
  findDefaultProduct(@Param('id') id: string) {
    return this.creditsService.findDefaultProduct(id);
  }

  @Put('credits/default-products/:id')
  @ApiOperation({ summary: 'Atualizar oferta default de produto de crédito' })
  @ApiBody({ type: UpdateCreditProductDto })
  updateDefaultProduct(
    @Param('id') id: string,
    @Body() dto: UpdateCreditProductDto,
  ) {
    return this.creditsService.updateDefaultProduct(id, dto);
  }

  @Put('credits/default-products/:id/toggle-active')
  @ApiOperation({ summary: 'Ativar ou desativar oferta default' })
  toggleDefaultProductActive(@Param('id') id: string) {
    return this.creditsService.toggleDefaultProductActive(id);
  }

  @Put('credits/default-products/:id/restore')
  @ApiOperation({ summary: 'Restaurar oferta default removida' })
  restoreDefaultProduct(@Param('id') id: string) {
    return this.creditsService.restoreDefaultProduct(id);
  }

  @Delete('credits/default-products/:id')
  @ApiOperation({ summary: 'Remover oferta default de produto de crédito' })
  removeDefaultProduct(@Param('id') id: string) {
    return this.creditsService.removeDefaultProduct(id);
  }
}
