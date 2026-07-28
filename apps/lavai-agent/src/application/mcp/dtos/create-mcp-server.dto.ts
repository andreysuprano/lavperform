import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { McpTransport } from '../ports/mcp-server.repository.port';

export class CreateMcpServerDto {
  @ApiProperty({ description: 'Nome de exibição do servidor MCP', example: 'Filesystem' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: McpTransport,
    description: 'Tipo de transporte: STDIO (processo local) ou SSE (HTTP remoto)',
    example: McpTransport.STDIO,
  })
  @IsEnum(McpTransport)
  transport: McpTransport;

  @ApiPropertyOptional({ description: 'Habilitar/desabilitar o servidor', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  // ── STDIO ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Executável para STDIO (ex: "npx", "python")',
    example: 'npx',
  })
  @ValidateIf((o: CreateMcpServerDto) => o.transport === McpTransport.STDIO)
  @IsString()
  command?: string;

  @ApiPropertyOptional({
    description: 'Argumentos do comando STDIO',
    example: ['-y', '@modelcontextprotocol/server-filesystem', '/data'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  args?: string[];

  @ApiPropertyOptional({
    description: 'Variáveis de ambiente para o processo STDIO',
    example: { API_KEY: 'secret' },
  })
  @IsObject()
  @IsOptional()
  env?: Record<string, string>;

  // ── SSE / HTTP ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'URL do endpoint SSE do servidor MCP remoto',
    example: 'http://localhost:3001/sse',
  })
  @ValidateIf((o: CreateMcpServerDto) => o.transport === McpTransport.SSE)
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional({
    description: 'Cabeçalhos HTTP extras para SSE',
    example: { Authorization: 'Bearer token' },
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;
}
