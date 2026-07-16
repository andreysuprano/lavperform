import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AudiencesService } from '../application/audiences.service';
import {
  CreateAudienceDto,
  PreviewAudienceDto,
  UpdateAudienceDto,
} from '../application/dto/audience.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Audiences')
@Controller('companies/:companyId/audiences')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar audiência' })
  create(@Param('companyId') companyId: string, @Body() dto: CreateAudienceDto) {
    return this.audiencesService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar audiências' })
  findAll(@Param('companyId') companyId: string, @Query() pagination: PaginationDto) {
    return this.audiencesService.findAll(companyId, pagination);
  }

  @Get('metadata/criteria')
  @ApiOperation({ summary: 'Listar critérios disponíveis' })
  getCriteria() {
    return this.audiencesService.getCriteriaMetadata();
  }

  @Get('metadata/products')
  @ApiOperation({ summary: 'Autocomplete de produtos' })
  @ApiQuery({ name: 'search', required: false })
  getProducts(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
  ) {
    return this.audiencesService.getProductNames(companyId, search);
  }

  @Get('metadata/neighborhoods')
  @ApiOperation({ summary: 'Autocomplete de bairros' })
  @ApiQuery({ name: 'search', required: false })
  getNeighborhoods(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
  ) {
    return this.audiencesService.getNeighborhoods(companyId, search);
  }

  @Get('metadata/cities')
  @ApiOperation({ summary: 'Autocomplete de cidades' })
  @ApiQuery({ name: 'search', required: false })
  getCities(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
  ) {
    return this.audiencesService.getCities(companyId, search);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview de audiência sem salvar' })
  preview(@Param('companyId') companyId: string, @Body() dto: PreviewAudienceDto) {
    return this.audiencesService.preview(companyId, dto);
  }

  @Get(':id/count')
  @ApiOperation({ summary: 'Contagem atual de clientes na audiência' })
  count(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.audiencesService.count(companyId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da audiência' })
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.audiencesService.findOne(companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar audiência' })
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAudienceDto,
  ) {
    return this.audiencesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir audiência' })
  @ApiResponse({ status: 200, description: 'Audiência excluída' })
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.audiencesService.remove(companyId, id);
  }
}
