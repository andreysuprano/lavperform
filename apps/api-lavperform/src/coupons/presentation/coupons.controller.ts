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
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CouponsService } from '../application/coupons.service';
import { CreateCouponDto } from '../application/dto/create-coupon.dto';
import { UpdateCouponDto } from '../application/dto/update-coupon.dto';
import { CouponFilterDto } from '../application/dto/coupon-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Coupons')
@Controller('coupons/:companyId')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) {}

    @Post()
    @ApiOperation({ summary: 'Criar um novo cupom' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiBody({ type: CreateCouponDto })
    @ApiResponse({ status: 201, description: 'Cupom criado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 409, description: 'Já existe um cupom com este código' })
    create(
        @Param('companyId') companyId: string,
        @Body() dto: CreateCouponDto,
    ) {
        return this.couponsService.create(companyId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar cupons da empresa' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiResponse({ status: 200, description: 'Lista paginada de cupons' })
    findAll(
        @Param('companyId') companyId: string,
        @Query() pagination: PaginationDto,
        @Query() filter: CouponFilterDto,
    ) {
        return this.couponsService.findAll(companyId, pagination, filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar um cupom por ID' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiParam({ name: 'id', description: 'ID do cupom' })
    @ApiResponse({ status: 200, description: 'Cupom encontrado' })
    @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
    findOne(
        @Param('companyId') companyId: string,
        @Param('id') id: string,
    ) {
        return this.couponsService.findOne(companyId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar um cupom' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiParam({ name: 'id', description: 'ID do cupom' })
    @ApiBody({ type: UpdateCouponDto })
    @ApiResponse({ status: 200, description: 'Cupom atualizado com sucesso' })
    @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
    @ApiResponse({ status: 409, description: 'Já existe outro cupom com este código' })
    update(
        @Param('companyId') companyId: string,
        @Param('id') id: string,
        @Body() dto: UpdateCouponDto,
    ) {
        return this.couponsService.update(companyId, id, dto);
    }

    @Put(':id/toggle-active')
    @ApiOperation({ summary: 'Ativar/Desativar um cupom' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiParam({ name: 'id', description: 'ID do cupom' })
    @ApiResponse({ status: 200, description: 'Status do cupom atualizado com sucesso' })
    @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
    toggleActive(
        @Param('companyId') companyId: string,
        @Param('id') id: string,
    ) {
        return this.couponsService.toggleActive(companyId, id);
    }

    @Put(':id/restore')
    @ApiOperation({ summary: 'Restaurar um cupom removido (soft delete)' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiParam({ name: 'id', description: 'ID do cupom' })
    @ApiResponse({ status: 200, description: 'Cupom restaurado com sucesso' })
    restore(
        @Param('companyId') companyId: string,
        @Param('id') id: string,
    ) {
        return this.couponsService.restore(companyId, id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover um cupom (soft delete)' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiParam({ name: 'id', description: 'ID do cupom' })
    @ApiResponse({ status: 200, description: 'Cupom removido com sucesso' })
    @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
    remove(
        @Param('companyId') companyId: string,
        @Param('id') id: string,
    ) {
        return this.couponsService.remove(companyId, id);
    }
}
