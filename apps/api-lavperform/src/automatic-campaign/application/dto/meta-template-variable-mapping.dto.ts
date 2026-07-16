import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Min } from 'class-validator';
import { META_TEMPLATE_VARIABLE_SOURCE } from '../../../integrations/meta/application/meta-template-variables.utils';

const ALLOWED_SOURCES = Object.values(META_TEMPLATE_VARIABLE_SOURCE);

export class MetaTemplateVariableMappingDto {
  @ApiProperty({
    description: 'Índice da variável no template ({{1}} → index 1)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  index: number;

  @ApiProperty({
    description: 'Fonte de dados usada para preencher a variável no envio',
    example: META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_FIRST_NAME,
    enum: ALLOWED_SOURCES,
  })
  @IsString()
  @IsIn(ALLOWED_SOURCES)
  source: string;
}
