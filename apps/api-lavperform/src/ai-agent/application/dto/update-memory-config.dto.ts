import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { MemoryType } from './create-agent.dto';

export class UpdateMemoryConfigDto {
  @ApiPropertyOptional({ enum: MemoryType, description: 'Tipo de memória: BUFFER, SUMMARY, VECTOR ou NONE' })
  @IsEnum(MemoryType)
  @IsOptional()
  memoryType?: MemoryType;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, description: 'Janela de mensagens (apenas BUFFER)' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  windowSize?: number;

  @ApiPropertyOptional({ description: 'Tokens máximos no resumo (apenas SUMMARY)' })
  @IsInt()
  @IsOptional()
  maxSummaryTokens?: number;

  @ApiPropertyOptional({ description: 'Habilita memória de longo prazo via vector store' })
  @IsBoolean()
  @IsOptional()
  useLongTermMemory?: boolean;
}
