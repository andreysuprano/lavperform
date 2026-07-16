import { 
    Body, 
    Controller, 
    Delete, 
    Get, 
    Param, 
    Patch, 
    Post, 
    UseGuards 
} from '@nestjs/common';
import { 
    ApiTags, 
    ApiOperation, 
    ApiBearerAuth, 
    ApiParam, 
    ApiBody 
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WeatherAlertService } from '../application/weather-alert.service';
import { WeatherAlertHistoryService } from '../application/weather-alert-history.service';
import { CreateWeatherAlertDto, ToggleWeatherAlertDto } from '../application/dto/weather-alert.dto';

@ApiTags('Weather Alert')
@Controller('weather-alert')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WeatherAlertController {
    constructor(
        private readonly weatherAlertService: WeatherAlertService,
        private readonly weatherAlertHistoryService: WeatherAlertHistoryService,
    ) { }

    @Post('company/:companyId')
    @ApiOperation({ 
        summary: 'Criar ou atualizar configuração de alerta de clima',
        description: 'Se já existir uma configuração para a empresa, ela será atualizada. Caso contrário, uma nova será criada.'
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiBody({ type: CreateWeatherAlertDto })
    createOrUpdate(
        @Param('companyId') companyId: string,
        @Body() createWeatherAlertDto: CreateWeatherAlertDto
    ) {
        return this.weatherAlertService.createOrUpdate(companyId, createWeatherAlertDto);
    }

    @Get('company/:companyId')
    @ApiOperation({ summary: 'Obter configuração de alerta de clima da empresa' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    findByCompanyId(@Param('companyId') companyId: string) {
        return this.weatherAlertService.findByCompanyId(companyId);
    }

    @Patch('company/:companyId/toggle')
    @ApiOperation({ 
        summary: 'Ativar ou desativar alertas de clima',
        description: 'Permite ativar ou desativar os alertas sem alterar outras configurações'
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiBody({ type: ToggleWeatherAlertDto })
    toggleActive(
        @Param('companyId') companyId: string,
        @Body() toggleDto: ToggleWeatherAlertDto
    ) {
        return this.weatherAlertService.toggleActive(companyId, toggleDto);
    }

    @Delete('company/:companyId')
    @ApiOperation({ summary: 'Deletar configuração de alerta de clima da empresa' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    deleteByCompanyId(@Param('companyId') companyId: string) {
        return this.weatherAlertService.delete(companyId);
    }

    @Get('company/:companyId/weather')
    @ApiOperation({ 
        summary: 'Obter dados meteorológicos da cidade da empresa',
        description: 'Retorna os dados atuais do tempo da cidade onde a empresa está localizada'
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    getWeatherForCompany(@Param('companyId') companyId: string) {
        return this.weatherAlertService.getWeatherForCompany(companyId);
    }

    @Get('company/:companyId/history')
    @ApiOperation({ 
        summary: 'Obter histórico de alertas enviados',
        description: 'Retorna o histórico de todos os alertas enviados para a empresa'
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    getHistory(@Param('companyId') companyId: string) {
        return this.weatherAlertHistoryService.findByCompanyId(companyId);
    }
}
