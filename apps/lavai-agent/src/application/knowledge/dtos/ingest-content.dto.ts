import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class IngestContentDto {
  @ApiProperty({ description: 'Texto a ser indexado na base de conhecimento' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Metadados adicionais associados ao conteúdo' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
