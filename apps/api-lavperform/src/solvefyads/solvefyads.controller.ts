import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SolvefyAdsService } from './solvefyads.service';
import { AdsEmbedTokenDto } from './dto/ads-embed-token.dto';

interface JwtUser {
  userId: string;
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Ads')
@Controller('ads')
export class SolvefyAdsController {
  constructor(private readonly solvefyAdsService: SolvefyAdsService) {}

  @Post('embed-token')
  @ApiOperation({
    summary: 'Token de embed (SSO parceiro)',
    description:
      'Gera token de embed usando o ID, e-mail e nome cadastrados da empresa informada. ' +
      'O usuário autenticado precisa estar vinculado à empresa.',
  })
  @ApiBody({ type: AdsEmbedTokenDto })
  @ApiResponse({
    status: 200,
    description:
      'JWT de embed (`token`, mapeado do `embedToken` do parceiro) e validade opcional em ISO 8601',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresAt: '2026-05-06T16:12:01.203Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Requisição inválida' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem acesso à empresa' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async getEmbedToken(
    @Body() dto: AdsEmbedTokenDto,
    @Req() req: { user: JwtUser },
  ): Promise<{ token: string; expiresAt?: string }> {
    return this.solvefyAdsService.getEmbedTokenForCompany(dto.companyId, req.user.userId);
  }
}
