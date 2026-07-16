import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { ConversionWindowService } from '../application/conversion-window.service';
import { UpdateConversionWindowDto } from '../application/dto/update-conversion-window.dto';
import { ClientTypes } from '../../common/utils/rfvClassification';

@ApiTags('Conversion Window')
@Controller('conversion-window')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ConversionWindowController {
    constructor(private readonly conversionWindowService: ConversionWindowService) {}

    @Get('company/:companyId')
    @ApiOperation({
        summary: 'Janela de conversão (todas as classificações RFV)',
        description:
            'Retorna um objeto cujas chaves são as classificações RFV em camelCase e os valores são os dias de threshold. Registros ausentes são criados com 7 dias por padrão.',
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiOkResponse({
        description: 'Mapa classificação (camelCase) → dias',
        schema: {
            type: 'object',
            additionalProperties: { type: 'number' },
            example: {
                campeao: 7,
                fiel: 7,
                emPotencial: 14,
                novo: 7,
                promissor: 7,
                precisaDeAtencao: 7,
                quaseDormente: 7,
                naoPossoPerder: 7,
                emRisco: 7,
                hibernando: 7,
                perdido: 7,
            },
        },
    })
    getByCompany(@Param('companyId') companyId: string) {
        return this.conversionWindowService.getOrCreateForCompany(companyId);
    }

    @Get('company/:companyId/segment/:rfvClassification')
    @ApiOperation({
        summary: 'Janela de conversão por classificação RFV',
        description: 'Retorna o threshold em dias para um único segmento da matriz RFV.',
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiParam({
        name: 'rfvClassification',
        description: 'Classificação RFV',
        enum: ClientTypes,
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                rfvClassification: { type: 'string', example: 'campeao' },
                thresholdDays: { type: 'number', example: 7 },
            },
        },
    })
    getByCompanyAndSegment(
        @Param('companyId') companyId: string,
        @Param('rfvClassification') rfvClassification: string,
    ) {
        return this.conversionWindowService.getByCompanyAndClassification(companyId, rfvClassification);
    }

    @Put('company/:companyId')
    @ApiOperation({
        summary: 'Atualizar janela de conversão',
        description:
            'Cria ou atualiza os limiares enviados por classificação RFV (body continua com enum snake_case). Demais segmentos recebem default de 7 dias se ainda não existirem. Resposta no mesmo formato do GET (objeto com chaves camelCase → dias).',
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiOkResponse({
        description: 'Mapa classificação (camelCase) → dias após atualização',
        schema: {
            type: 'object',
            additionalProperties: { type: 'number' },
        },
    })
    putByCompany(@Param('companyId') companyId: string, @Body() dto: UpdateConversionWindowDto) {
        return this.conversionWindowService.upsertForCompany(companyId, dto);
    }
}
