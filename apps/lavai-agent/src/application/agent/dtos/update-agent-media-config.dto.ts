import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAgentMediaConfigDto {
  // ─── Áudio ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: true,
    description: 'Habilita transcrição de mensagens de áudio via Whisper (OpenAI)',
  })
  @IsBoolean()
  @IsOptional()
  audioEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'Desculpe, não consigo processar mensagens de áudio. Por favor, envie sua mensagem em texto.',
    description: 'Mensagem enviada ao usuário quando o áudio está desabilitado',
  })
  @IsString()
  @IsOptional()
  audioDefaultMessage?: string | null;

  // ─── Imagem ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: true,
    description: 'Habilita interpretação de imagens via GPT-4o Vision (OpenAI)',
  })
  @IsBoolean()
  @IsOptional()
  imageEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'Descreva detalhadamente o conteúdo da imagem: objetos, texto visível, cores, contexto e qualquer informação relevante.',
    description: 'Prompt usado para extrair informações da imagem. Define o que o Vision deve identificar.',
  })
  @IsString()
  @IsOptional()
  imageExtractionPrompt?: string | null;

  @ApiPropertyOptional({
    example: 'Desculpe, não consigo processar imagens. Por favor, descreva o que você precisa em texto.',
    description: 'Mensagem enviada ao usuário quando imagens estão desabilitadas',
  })
  @IsString()
  @IsOptional()
  imageDefaultMessage?: string | null;

  // ─── Vídeo ───────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: true,
    description: 'Habilita interpretação de vídeos via GPT-4o Vision (usando thumbnail)',
  })
  @IsBoolean()
  @IsOptional()
  videoEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'Analise o frame do vídeo e descreva o conteúdo: cena, pessoas, objetos, texto visível e contexto geral.',
    description: 'Prompt usado para extrair informações do vídeo (via thumbnail). Define o que o Vision deve identificar.',
  })
  @IsString()
  @IsOptional()
  videoExtractionPrompt?: string | null;

  @ApiPropertyOptional({
    example: 'Desculpe, não consigo processar vídeos. Por favor, descreva o conteúdo em texto.',
    description: 'Mensagem enviada ao usuário quando vídeos estão desabilitados',
  })
  @IsString()
  @IsOptional()
  videoDefaultMessage?: string | null;
}
