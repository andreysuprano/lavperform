import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';

export enum McpTransport {
  STDIO = 'STDIO',
  SSE = 'SSE',
}

export class CreateMcpServerDto {
  @ApiProperty({ description: 'Nome de exibição do servidor MCP' })
  @IsString()
  name: string;

  @ApiProperty({ enum: McpTransport, description: 'Tipo de transporte: STDIO ou SSE' })
  @IsEnum(McpTransport)
  transport: McpTransport;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Executável para STDIO (ex: npx, python)' })
  @IsString()
  @IsOptional()
  command?: string;

  @ApiPropertyOptional({ type: [String], description: 'Argumentos do comando STDIO' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  args?: string[];

  @ApiPropertyOptional({ description: 'Variáveis de ambiente para processo STDIO' })
  @IsObject()
  @IsOptional()
  env?: Record<string, string>;

  @ApiPropertyOptional({ description: 'URL do endpoint SSE' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Cabeçalhos HTTP extras para SSE (ex: Authorization)' })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;
}
