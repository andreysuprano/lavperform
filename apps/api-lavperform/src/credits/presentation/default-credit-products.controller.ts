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
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreditsService } from '../application/credits.service';
import { CreateCreditProductDto } from '../application/dto/create-credit-product.dto';
import { UpdateCreditProductDto } from '../application/dto/update-credit-product.dto';
import { CreditProductFilterDto } from '../application/dto/credit-product-filter.dto';

@ApiTags('Credits')
@Controller('credits/default-products')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DefaultCreditProductsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar oferta default de produto de crédito' })
  @ApiBody({ type: CreateCreditProductDto })
  @ApiResponse({
    status: 201,
    description: 'Oferta default criada com sucesso',
  })
  create(@Body() dto: CreateCreditProductDto) {
    return this.creditsService.createDefaultProduct(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ofertas default de produtos de crédito' })
  findAll(@Query() filter: CreditProductFilterDto) {
    return this.creditsService.findDefaultProducts(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar oferta default por ID' })
  findOne(@Param('id') id: string) {
    return this.creditsService.findDefaultProduct(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar oferta default de produto de crédito' })
  @ApiBody({ type: UpdateCreditProductDto })
  update(@Param('id') id: string, @Body() dto: UpdateCreditProductDto) {
    return this.creditsService.updateDefaultProduct(id, dto);
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Ativar ou desativar oferta default' })
  toggleActive(@Param('id') id: string) {
    return this.creditsService.toggleDefaultProductActive(id);
  }

  @Put(':id/restore')
  @ApiOperation({ summary: 'Restaurar oferta default removida' })
  restore(@Param('id') id: string) {
    return this.creditsService.restoreDefaultProduct(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover oferta default de produto de crédito' })
  remove(@Param('id') id: string) {
    return this.creditsService.removeDefaultProduct(id);
  }
}
