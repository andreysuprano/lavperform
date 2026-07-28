import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { McpTransport } from '../ports/mcp-server.repository.port';

export class UpdateMcpServerDto {
  @ApiPropertyOptional({ description: 'Nome de exibição do servidor MCP' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: McpTransport })
  @IsEnum(McpTransport)
  @IsOptional()
  transport?: McpTransport;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Executável para STDIO' })
  @IsString()
  @IsOptional()
  command?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  args?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  env?: Record<string, string>;

  @ApiPropertyOptional({ description: 'URL do endpoint SSE' })
  @IsUrl({ require_tld: false })
  @IsOptional()
  url?: string | null;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;
}
