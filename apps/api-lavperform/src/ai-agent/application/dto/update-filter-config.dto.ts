import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateFilterConfigDto {
  @ApiPropertyOptional({ type: [String], description: 'Telefones permitidos (sem +). Vazio = aceita qualquer número.' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedPhones?: string[];

  @ApiPropertyOptional({ type: [String], description: 'chatIds de grupos WhatsApp permitidos. Vazio = aceita qualquer grupo.' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedGroups?: string[];

  @ApiPropertyOptional({ description: 'Agente só responde quando encontrar uma triggerWord' })
  @IsBoolean()
  @IsOptional()
  triggerEnabled?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Palavras que ativam o agente' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  triggerWords?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  triggerCaseSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Remove a trigger word do texto antes de enviar ao agente' })
  @IsBoolean()
  @IsOptional()
  triggerRemoveFromText?: boolean;
}
