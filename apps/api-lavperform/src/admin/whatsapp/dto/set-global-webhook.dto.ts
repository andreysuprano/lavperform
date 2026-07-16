import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class SetGlobalWebhookDto {
  @ApiProperty({
    description: 'Habilitar ou desabilitar o webhook global',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'URL de destino do webhook global',
    example: 'https://api.minhaapp.com/webhook',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Eventos a serem enviados ao webhook global',
    required: false,
    example: ['connection', 'messages'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}
