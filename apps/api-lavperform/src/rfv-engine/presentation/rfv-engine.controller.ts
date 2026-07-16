import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RfvEngineService } from '../application/rfv-engine.service';
import { RfvCalculationDto } from '../application/dto/rfv-calculation.dto';
import { BatchRfvCalculationDto } from '../application/dto/batch-rfv-calculation.dto';
import { UpdateRfvConfigurationDto } from '../application/dto/update-rfv-configuration.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('RFV Engine')
@Controller('rfv-engine')
export class RfvEngineController {
    constructor(private readonly rfvEngineService: RfvEngineService) {}

    @Post('calculate/customer')
    async calculateForCustomer(@Body() dto: RfvCalculationDto) {
        await this.rfvEngineService.calculateForCustomer(dto.customerId);
        return { message: 'Cálculo RFV enfileirado com sucesso' };
    }

    @Post('calculate/batch')
    async calculateBatch(@Body() dto: BatchRfvCalculationDto) {
        await this.rfvEngineService.calculateForCompany(dto.companyId, dto.customerIds);
        return { message: 'Cálculo RFV em lote enfileirado com sucesso' };
    }

    @Get('configuration/:companyId')
    async getConfiguration(@Param('companyId') companyId: string) {
        return await this.rfvEngineService.getConfiguration(companyId);
    }

    @Put('configuration/:companyId')
    async updateConfiguration(
        @Param('companyId') companyId: string,
        @Body() dto: UpdateRfvConfigurationDto,
    ) {
        return await this.rfvEngineService.updateConfiguration(companyId, dto);
    }

    @Post('configuration/:companyId/auto')
    async autoConfigure(@Param('companyId') companyId: string) {
        await this.rfvEngineService.queueAutomaticConfiguration(companyId);
        return {
            message: 'Configuração automática enfileirada com sucesso',
            companyId,
        };
    }

    @Get('customer/:customerId/history')
    async getCustomerHistory(@Param('customerId') customerId: string) {
        return await this.rfvEngineService.getCustomerRfvHistory(customerId);
    }

    @Get('customer/:customerId/latest')
    async getCustomerLatest(@Param('customerId') customerId: string) {
        return await this.rfvEngineService.getCustomerLatestRfv(customerId);
    }

    @Get('statistics/:companyId')
    async getStatistics(@Param('companyId') companyId: string) {
        return await this.rfvEngineService.getSegmentStatistics(companyId);
    }

    @Post('reprocess/:companyId')
    async reprocessCompany(@Param('companyId') companyId: string) {
        await this.rfvEngineService.calculateForCompany(companyId);
        return { 
            message: 'Reprocessamento de toda a base enfileirado com sucesso',
            companyId,
        };
    }
}
