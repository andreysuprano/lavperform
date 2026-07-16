import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../common/decorators/user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PublicApiKeysService } from '../public-api/api-keys/public-api-keys.service';

@ApiTags('API Keys')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('companies/:companyId/api-keys')
export class CompanyApiKeysController {
  constructor(
    private readonly publicApiKeysService: PublicApiKeysService,
    private readonly prisma: PrismaService,
  ) {}

  private async ensureUserHasCompanyAccess(
    userId: string,
    companyId: string,
  ): Promise<void> {
    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!link) {
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar API keys da empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'Lista de API keys' })
  @ApiResponse({ status: 403, description: 'Sem acesso à empresa' })
  async list(@Param('companyId') companyId: string, @User() userId: string) {
    await this.ensureUserHasCompanyAccess(userId, companyId);
    return this.publicApiKeysService.list(companyId);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Consultar API key ativa',
    description:
      'Retorna a chave ativa da empresa para integração via Public API.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'API key ativa encontrada' })
  @ApiResponse({ status: 404, description: 'Nenhuma API key ativa encontrada' })
  @ApiResponse({ status: 403, description: 'Sem acesso à empresa' })
  async getActive(
    @Param('companyId') companyId: string,
    @User() userId: string,
  ) {
    await this.ensureUserHasCompanyAccess(userId, companyId);
    return this.publicApiKeysService.getActive(companyId);
  }

  @Post('rotate')
  @ApiOperation({
    summary: 'Gerar nova API key',
    description:
      'Revoga a chave ativa anterior e gera uma nova para a empresa. ' +
      'Retorna o secret completo apenas nesta resposta.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 201, description: 'Nova API key gerada' })
  @ApiResponse({ status: 403, description: 'Sem acesso à empresa' })
  async rotate(
    @Param('companyId') companyId: string,
    @User() userId: string,
  ) {
    await this.ensureUserHasCompanyAccess(userId, companyId);
    return this.publicApiKeysService.rotate(companyId);
  }
}
