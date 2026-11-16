import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateAiModelsDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Id do modelo de texto na OpenRouter. Null ou vazio volta ao fallback.',
    example: 'google/gemini-2.5-flash',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(200)
  textModel?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Id do modelo de imagem na OpenRouter. Precisa gerar imagem. Null ou vazio volta ao fallback.',
    example: 'google/gemini-2.5-flash-image',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(200)
  imageModel?: string | null;
}
