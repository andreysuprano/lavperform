import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  AgentMemoryConfigDto,
  AgentModelConfigDto,
  AgentPersonaDto,
} from '../../../application/agent/dtos/create-agent.dto';

export class CreatePlatformAgentDto {
  @ApiProperty({ example: 'Assistente da plataforma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Recusado. Agente de plataforma não tem instância WhatsApp.',
  })
  @IsString()
  @IsOptional()
  instanceName?: string;

  @ApiPropertyOptional({ type: AgentPersonaDto })
  @ValidateNested()
  @Type(() => AgentPersonaDto)
  @IsOptional()
  persona?: AgentPersonaDto;

  @ApiPropertyOptional({ type: AgentModelConfigDto })
  @ValidateNested()
  @Type(() => AgentModelConfigDto)
  @IsOptional()
  modelConfig?: AgentModelConfigDto;

  @ApiPropertyOptional({ type: AgentMemoryConfigDto })
  @ValidateNested()
  @Type(() => AgentMemoryConfigDto)
  @IsOptional()
  memoryConfig?: AgentMemoryConfigDto;
}

export class RunPlatformTurnDto {
  @ApiProperty()
  @IsUUID()
  contextCompanyId: string;

  @ApiProperty()
  @IsUUID()
  platformUserId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  text: string;
}

export class ListPlatformTurnsQueryDto {
  @ApiProperty()
  @IsUUID()
  contextCompanyId: string;

  @ApiProperty()
  @IsUUID()
  platformUserId: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
