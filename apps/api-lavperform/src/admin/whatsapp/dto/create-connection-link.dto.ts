import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateConnectionLinkDto {
  @ApiProperty({
    description: 'ID da empresa que irá conectar o WhatsApp',
    example: 'uuid-da-empresa',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    description:
      'Token da instância UAZAPI a vincular. Se omitido, usa a instância já registrada no banco ou na UAZAPI (adminField02).',
    required: false,
    example: 'token-da-instancia-uazapi',
  })
  @IsOptional()
  @IsString()
  instanceToken?: string;

  @ApiProperty({
    description:
      'URL pública do painel admin (origem) usada para montar o link /connect/:token. Se omitido, usa WHATSAPP_CONNECT_BASE_URL ou ADMIN_FRONTEND_URL no servidor.',
    required: false,
    example: 'https://admin.foodcrm.com.br',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  publicBaseUrl?: string;
}
