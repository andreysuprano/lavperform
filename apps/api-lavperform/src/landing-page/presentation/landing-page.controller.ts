import { 
    Body, 
    Controller, 
    Delete, 
    Get, 
    Param, 
    Patch, 
    Query, 
    UseGuards 
} from '@nestjs/common';
import { 
    ApiTags, 
    ApiOperation, 
    ApiBearerAuth, 
    ApiParam, 
    ApiBody, 
    ApiQuery 
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LandingPageService } from '../application/landing-page.service';
import { UpdateLandingPageDto } from '../application/dto/landing-page.dto';

@ApiTags('Landing Page')
@Controller('landing-page')
export class LandingPageController {
    constructor(private readonly landingPageService: LandingPageService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Listar todas as landing pages' })
    @ApiQuery({ name: 'companyId', required: false, description: 'Filtrar por ID da empresa' })
    findAll(@Query('companyId') companyId?: string) {
        return this.landingPageService.findAll(companyId);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Obter landing page por slug (público)' })
    @ApiParam({ name: 'slug', description: 'Slug único da landing page' })
    @ApiQuery({ name: 'onlyActive', required: false, description: 'Retornar apenas se estiver ativa', type: Boolean })
    findBySlug(
        @Param('slug') slug: string,
        @Query('onlyActive') onlyActive?: string
    ) {
        const isOnlyActive = onlyActive === 'true';
        return this.landingPageService.findBySlug(slug, isOnlyActive);
    }

    @Get('domain/:customDomain')
    @ApiOperation({ 
        summary: 'Obter landing page por domínio personalizado (público)',
        description: 'Busca a landing page pelo domínio customizado configurado (ex: minhalavanderia.com)'
    })
    @ApiParam({ name: 'customDomain', description: 'Domínio personalizado da landing page' })
    @ApiQuery({ name: 'onlyActive', required: false, description: 'Retornar apenas se estiver ativa', type: Boolean })
    findByCustomDomain(
        @Param('customDomain') customDomain: string,
        @Query('onlyActive') onlyActive?: string
    ) {
        const isOnlyActive = onlyActive === 'true';
        return this.landingPageService.findByCustomDomain(customDomain, isOnlyActive);
    }

    @Get('company/:companyId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obter landing page da empresa' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    findByCompanyId(@Param('companyId') companyId: string) {
        return this.landingPageService.findByCompanyId(companyId);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obter landing page por ID' })
    @ApiParam({ name: 'id', description: 'ID da landing page' })
    findOne(@Param('id') id: string) {
        return this.landingPageService.findOne(id);
    }

    @Patch('company/:companyId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Criar ou atualizar landing page da empresa',
        description: 'Se a landing page não existir, cria uma nova com os dados fornecidos ou com dados padrão. Se existir, atualiza apenas os campos enviados. Suporta atualização parcial de qualquer seção (branding, hero, services, etc.) ou do campo active.'
    })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    @ApiBody({ type: UpdateLandingPageDto })
    updateByCompanyId(
        @Param('companyId') companyId: string,
        @Body() updateLandingPageDto: UpdateLandingPageDto
    ) {
        return this.landingPageService.updateByCompanyId(companyId, updateLandingPageDto);
    }

    @Delete('company/:companyId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Deletar landing page da empresa' })
    @ApiParam({ name: 'companyId', description: 'ID da empresa' })
    deleteByCompanyId(@Param('companyId') companyId: string) {
        return this.landingPageService.deleteByCompanyId(companyId);
    }
}
