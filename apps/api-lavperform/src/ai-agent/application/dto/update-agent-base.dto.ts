import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateAgentBaseDto {
  @ApiPropertyOptional({ description: 'Nome do agente' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição do propósito do agente' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Nome único da instância WhatsApp (UAZAPI)' })
  @IsString()
  @IsOptional()
  instanceName?: string;
}
