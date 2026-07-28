import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @ApiProperty({ description: 'Nome da base de conhecimento' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descrição opcional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID do agente (null = compartilhada com toda a company)' })
  @IsOptional()
  @IsString()
  agentId?: string;
}
