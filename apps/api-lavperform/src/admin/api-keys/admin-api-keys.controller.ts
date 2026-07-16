import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminApiKeysService } from './admin-api-keys.service';
import { CreatePublicApiKeyDto } from './dto/create-public-api-key.dto';

@ApiTags('Admin API Keys')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/companies/:companyId/api-keys')
export class AdminApiKeysController {
  constructor(private readonly adminApiKeysService: AdminApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'Listar API keys da empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  list(@Param('companyId') companyId: string) {
    return this.adminApiKeysService.list(companyId);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Obter API key ativa',
    description:
      'Retorna a chave ativa da empresa para uso na Public API (integração direta).',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'API key ativa encontrada' })
  @ApiResponse({ status: 404, description: 'Nenhuma API key ativa encontrada' })
  getActive(@Param('companyId') companyId: string) {
    return this.adminApiKeysService.getActive(companyId);
  }

  @Post('rotate')
  @ApiOperation({
    summary: 'Rotacionar API key',
    description:
      'Revoga a chave ativa anterior e gera uma nova para integração direta via Public API. ' +
      'Retorna o secret completo apenas nesta resposta.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 201, description: 'Nova API key gerada' })
  rotate(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePublicApiKeyDto,
  ) {
    return this.adminApiKeysService.rotate(companyId, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar API key',
    description: 'Retorna o secret completo apenas nesta resposta.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 201, description: 'API key criada' })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePublicApiKeyDto,
  ) {
    return this.adminApiKeysService.create(companyId, dto);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revogar API key' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da API key' })
  revoke(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.adminApiKeysService.revoke(companyId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir API key' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da API key' })
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.adminApiKeysService.remove(companyId, id);
  }
}
