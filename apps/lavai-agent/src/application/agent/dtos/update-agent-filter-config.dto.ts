import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAgentFilterConfigDto {
  // ─── Filtros de acesso ───────────────────────────────────────────────────────

  @ApiPropertyOptional({
    type: [String],
    example: ['5541999990001', '5511988887777'],
    description:
      'Lista de telefones permitidos (formato E.164 sem +). ' +
      'Vazio ou omitido = aceita qualquer número.',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedPhones?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['120363XXXXXXXXXX@g.us', '120363YYYYYYYYYY@g.us'],
    description:
      'Lista de chatIds de grupos permitidos. ' +
      'Vazio ou omitido = aceita qualquer grupo.',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedGroups?: string[];

  // ─── Gatilho textual ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: false,
    description:
      'Ativa o gatilho: o agente só responde se encontrar uma das triggerWords no texto. ' +
      'Para texto: valida no conteúdo da mensagem. ' +
      'Para áudio: valida na transcrição. ' +
      'Para imagem/vídeo: valida na legenda (caption).',
  })
  @IsBoolean()
  @IsOptional()
  triggerEnabled?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['@bot', 'ajuda', '/start'],
    description:
      'Palavras ou frases que ativam o agente. Basta uma coincidir.',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  triggerWords?: string[];

  @ApiPropertyOptional({
    example: false,
    description: 'Se true, a comparação do gatilho é sensível a maiúsculas/minúsculas.',
  })
  @IsBoolean()
  @IsOptional()
  triggerCaseSensitive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Se true, remove a palavra de gatilho do texto antes de enviar ao agente ' +
      '(ex: remove "@bot" do início da mensagem).',
  })
  @IsBoolean()
  @IsOptional()
  triggerRemoveFromText?: boolean;
}
