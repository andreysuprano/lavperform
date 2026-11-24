import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConnectMetaIntegrationDto {
  @ApiPropertyOptional({
    description:
      'Número informado pelo Embedded Signup. Quando ausente, o número exibido é lido da Graph API.',
    example: '+5541997269435',
  })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({
    description: 'Business Integration System User Access Token obtido via Embedded Signup',
    example: 'EAAcs13SRPaoBRfg...',
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({
    description: 'Tipo do token',
    example: 'bearer',
  })
  @IsString()
  @IsNotEmpty()
  token_type: string;

  @ApiPropertyOptional({
    description:
      'ID do número de telefone na Meta (retornado pelo Embedded Signup session logging)',
    example: '106540352242922',
  })
  @IsOptional()
  @IsString()
  phone_number_id?: string;

  @ApiPropertyOptional({
    description:
      'WhatsApp Business Account ID (retornado pelo Embedded Signup session logging)',
    example: '524126980791429',
  })
  @IsOptional()
  @IsString()
  waba_id?: string;

  @ApiPropertyOptional({
    description: 'Business Portfolio ID (retornado pelo Embedded Signup session logging)',
    example: '2729063490586005',
  })
  @IsOptional()
  @IsString()
  business_id?: string;

  @ApiPropertyOptional({
    description:
      'Evento de conclusão do Embedded Signup. FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING indica número já em uso no app (Coex) e dispensa o registro do PIN.',
    example: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
  })
  @IsOptional()
  @IsString()
  signup_event?: string;
}
