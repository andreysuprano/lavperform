import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AgentCommunicationStyle,
  AgentLanguage,
  AgentMemoryType,
  AgentVoiceTone,
} from '../ports/agent.repository.port';

export class AgentPersonaDto {
  @ApiPropertyOptional({ example: 'Aria', description: 'Nome do agente nas conversas' })
  @IsString()
  @IsOptional()
  personaName?: string;

  @ApiPropertyOptional({ example: 'Assistente virtual especializado em atendimento ao cliente' })
  @IsString()
  @IsOptional()
  personaDescription?: string;

  @ApiPropertyOptional({
    example: 'Você é Aria, uma assistente virtual da Acme Corp. Responda de forma cordial e objetiva.',
    description: 'Prompt de sistema injetado no LLM',
  })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({
    example: 'Sempre se apresente pelo nome. Nunca prometa prazos sem consultar a equipe.',
    description: 'Regras de comportamento do agente',
  })
  @IsString()
  @IsOptional()
  behaviorGuidelines?: string;

  @ApiPropertyOptional({
    example: 'Nunca forneça informações financeiras detalhadas. Não discuta concorrentes.',
    description: 'O que o agente NÃO deve fazer',
  })
  @IsString()
  @IsOptional()
  guardrails?: string;

  @ApiPropertyOptional({
    example: 'A Acme Corp é uma empresa de tecnologia fundada em 2010...',
    description: 'Contexto do negócio injetado no prompt',
  })
  @IsString()
  @IsOptional()
  contextPrompt?: string;

  @ApiPropertyOptional({ example: 'Olá! Sou a Aria, como posso ajudar?' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({
    example: '_Atenciosamente, Aria 🤖_',
    description: 'Texto fixo adicionado ao final de todas as mensagens enviadas pelo agente',
  })
  @IsString()
  @IsOptional()
  messageSignature?: string;

  @ApiPropertyOptional({ enum: AgentVoiceTone, default: AgentVoiceTone.PROFESSIONAL })
  @IsEnum(AgentVoiceTone)
  @IsOptional()
  voiceTone?: AgentVoiceTone;

  @ApiPropertyOptional({ enum: AgentCommunicationStyle, default: AgentCommunicationStyle.BALANCED })
  @IsEnum(AgentCommunicationStyle)
  @IsOptional()
  communicationStyle?: AgentCommunicationStyle;

  @ApiPropertyOptional({ enum: AgentLanguage, default: AgentLanguage.PT_BR })
  @IsEnum(AgentLanguage)
  @IsOptional()
  language?: AgentLanguage;
}

export class AgentModelConfigDto {
  @ApiPropertyOptional({
    example: 'openai/gpt-4o',
    description:
      'Slug do modelo no OpenRouter (ex: openai/gpt-4o, anthropic/claude-3-5-sonnet, google/gemini-2.0-flash-001). ' +
      'Use GET /llm/models para listar os modelos disponíveis.',
  })
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiPropertyOptional({ example: 0.7, description: '0.0 = determinístico, 2.0 = criativo' })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ example: 1024, description: 'Máximo de tokens na resposta' })
  @IsInt()
  @Min(1)
  @Max(16384)
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Nucleus sampling (0.0–1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  topP?: number;

  @ApiPropertyOptional({ example: 0.0, description: 'Penalidade de frequência (-2.0–2.0)' })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  frequencyPenalty?: number;

  @ApiPropertyOptional({ example: 0.0, description: 'Penalidade de presença (-2.0–2.0)' })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  presencePenalty?: number;

  @ApiPropertyOptional({ example: false, description: 'Ativa streaming de tokens' })
  @IsBoolean()
  @IsOptional()
  streaming?: boolean;
}

export class AgentMemoryConfigDto {
  @ApiPropertyOptional({ enum: AgentMemoryType, default: AgentMemoryType.BUFFER })
  @IsEnum(AgentMemoryType)
  @IsOptional()
  memoryType?: AgentMemoryType;

  @ApiPropertyOptional({ example: 10, description: 'Mensagens na janela de contexto (BUFFER)' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  windowSize?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Tokens máximos no resumo (SUMMARY)' })
  @IsInt()
  @Min(100)
  @IsOptional()
  maxSummaryTokens?: number;

  @ApiPropertyOptional({ example: false, description: 'Habilita memória de longo prazo (vector store)' })
  @IsBoolean()
  @IsOptional()
  useLongTermMemory?: boolean;
}

export class CreateAgentDto {
  @ApiProperty({ example: 'Aria Atendimento', description: 'Nome interno do agente' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Agente de atendimento ao cliente para o canal WhatsApp' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'minha-empresa-atendimento',
    description:
      'Nome da instância WhatsApp no provider (UAZAPI instanceName). ' +
      'Vincula este agente a uma instância específica para roteamento correto ' +
      'quando a empresa possui múltiplos agentes/números.',
  })
  @IsString()
  @IsOptional()
  instanceName?: string;

  @ApiPropertyOptional({ type: AgentPersonaDto, description: 'Personalidade e prompts do agente' })
  @ValidateNested()
  @Type(() => AgentPersonaDto)
  @IsOptional()
  persona?: AgentPersonaDto;

  @ApiPropertyOptional({ type: AgentModelConfigDto, description: 'Parâmetros do modelo LLM' })
  @ValidateNested()
  @Type(() => AgentModelConfigDto)
  @IsOptional()
  modelConfig?: AgentModelConfigDto;

  @ApiPropertyOptional({ type: AgentMemoryConfigDto, description: 'Configuração de memória/contexto' })
  @ValidateNested()
  @Type(() => AgentMemoryConfigDto)
  @IsOptional()
  memoryConfig?: AgentMemoryConfigDto;
}
