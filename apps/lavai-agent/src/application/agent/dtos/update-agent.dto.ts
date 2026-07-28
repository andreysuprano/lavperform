import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAgentDto {
  @ApiPropertyOptional({ example: 'Aria Vendas' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Agente especializado em vendas' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    example: 'minha-empresa-atendimento',
    description:
      'Nome da instância WhatsApp vinculada ao agente. ' +
      'Envie null para desvincular. ' +
      'Roteamento do webhook usa este campo para encontrar o agente correto.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  instanceName?: string | null;
}
