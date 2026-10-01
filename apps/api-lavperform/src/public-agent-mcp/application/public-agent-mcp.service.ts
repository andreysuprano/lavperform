import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LavaiAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT = 32_000;

const NOT_FOUND = 'Agente não encontrado.';
const NO_FIELDS = 'Informe ao menos um campo da persona.';
const BLANK_REQUIRED =
  'Nome da persona e prompt de sistema não podem ficar em branco.';
const FIRST_PERSONA = 'A primeira persona precisa de nome e prompt de sistema.';
const TOO_LONG = 'Cada texto da persona pode ter no máximo 32000 caracteres.';
const BAD_ENUM = 'Tom, estilo ou idioma fora dos valores aceitos.';
const UNAVAILABLE = 'LavAI indisponível.';

const TEXT_FIELDS = [
  'personaName',
  'personaDescription',
  'systemPrompt',
  'behaviorGuidelines',
  'guardrails',
  'contextPrompt',
  'welcomeMessage',
  'messageSignature',
] as const;

const REQUIRED_TEXT = ['personaName', 'systemPrompt'] as const;

const ENUM_FIELDS = {
  voiceTone: [
    'FORMAL',
    'INFORMAL',
    'FRIENDLY',
    'PROFESSIONAL',
    'EMPATHETIC',
    'ASSERTIVE',
  ],
  communicationStyle: [
    'CONCISE',
    'DETAILED',
    'TECHNICAL',
    'SIMPLIFIED',
    'BALANCED',
  ],
  language: ['PT_BR', 'EN_US', 'ES_ES'],
} as const;

const PERSONA_FIELDS = [...TEXT_FIELDS, ...Object.keys(ENUM_FIELDS)] as const;

export type PublicAgentSession = {
  lavperformCompanyId: string;
  overAgentCompanyId: string;
};

export type ToolResult<T> =
  { ok: true; data: T } | { ok: false; message: string };

type PersonaField = (typeof PERSONA_FIELDS)[number];

type PersonaView = Record<PersonaField, string | null>;

type AgentView = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  persona: PersonaView | null;
};

type OwnedAgent = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  persona: PersonaView | null;
};

@Injectable()
export class PublicAgentMcpService {
  private readonly logger = new Logger(PublicAgentMcpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lavai: LavaiAgentApiService,
    private readonly config: ConfigService,
  ) {}

  async openSession(
    apiKey: string | undefined,
    companyId: string | undefined,
  ): Promise<PublicAgentSession> {
    this.assertApiKey(apiKey);
    if (!companyId || !UUID.test(companyId)) {
      throw new BadRequestException();
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { overAgentCompanyId: true },
    });
    if (!company?.overAgentCompanyId) {
      throw new NotFoundException();
    }

    return {
      lavperformCompanyId: companyId,
      overAgentCompanyId: company.overAgentCompanyId,
    };
  }

  assertApiKey(apiKey: string | undefined): void {
    const expected =
      this.config.get<string>('MCP_PUBLIC_AGENTS_API_KEY')?.trim() ?? '';
    if (!expected) {
      this.logger.error('MCP_PUBLIC_AGENTS_API_KEY não está definida.');
      throw new UnauthorizedException();
    }
    if (!apiKey || !keysMatch(expected, apiKey)) {
      throw new UnauthorizedException();
    }
  }

  assertSameCompany(
    session: PublicAgentSession,
    companyHeader: string | undefined,
  ): void {
    if (companyHeader === undefined) return;
    if (companyHeader !== session.lavperformCompanyId) {
      throw new BadRequestException();
    }
  }

  async list(session: PublicAgentSession): Promise<
    ToolResult<
      Array<{
        id: string;
        name: string;
        description: string | null;
        active: boolean;
      }>
    >
  > {
    try {
      const agents = await this.lavai.listAgents(session.overAgentCompanyId);
      return {
        ok: true,
        data: agents.map((agent) => ({
          id: String(agent.id),
          name: String(agent.name),
          description: asString(agent.description),
          active: Boolean(agent.active),
        })),
      };
    } catch (error) {
      return this.motorFailure(error);
    }
  }

  async getPersona(
    session: PublicAgentSession,
    agentId: string,
  ): Promise<ToolResult<AgentView>> {
    const owned = await this.loadOwned(session, agentId);
    if (!owned.ok) return owned;
    return { ok: true, data: owned.data };
  }

  async updatePersona(
    session: PublicAgentSession,
    agentId: string,
    input: Record<string, unknown>,
  ): Promise<ToolResult<AgentView>> {
    const owned = await this.loadOwned(session, agentId);
    if (!owned.ok) return owned;

    const picked = pickFields(input);
    if (Object.keys(picked).length === 0) {
      return { ok: false, message: NO_FIELDS };
    }

    const normalized = normalizeFields(picked);
    if (!normalized.ok) return normalized;

    if (
      owned.data.persona == null &&
      (!normalized.data.personaName || !normalized.data.systemPrompt)
    ) {
      return { ok: false, message: FIRST_PERSONA };
    }

    try {
      const saved = await this.lavai.updatePersona(agentId, normalized.data);
      const persona = mapPersona(saved);
      if (!persona) return this.unexpectedMotorResponse();
      return { ok: true, data: { ...owned.data, persona } };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { ok: false, message: NOT_FOUND };
      }
      return this.motorFailure(error);
    }
  }

  private async loadOwned(
    session: PublicAgentSession,
    agentId: string,
  ): Promise<ToolResult<OwnedAgent>> {
    if (!UUID.test(agentId)) {
      return { ok: false, message: NOT_FOUND };
    }

    try {
      const raw = await this.lavai.getAgent(agentId);
      if (
        raw.kind !== 'PUBLIC' ||
        raw.companyId !== session.overAgentCompanyId
      ) {
        return { ok: false, message: NOT_FOUND };
      }
      return {
        ok: true,
        data: {
          id: String(raw.id),
          name: String(raw.name),
          description: asString(raw.description),
          active: Boolean(raw.active),
          persona: mapPersona(raw.persona),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { ok: false, message: NOT_FOUND };
      }
      return this.motorFailure(error);
    }
  }

  private motorFailure(error: unknown): ToolResult<never> {
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.error(detail);
    return { ok: false, message: UNAVAILABLE };
  }

  private unexpectedMotorResponse(): ToolResult<never> {
    this.logger.error('Resposta do LavAI sem a persona esperada.');
    return { ok: false, message: UNAVAILABLE };
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function keysMatch(expected: string, provided: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function pickFields(
  input: Record<string, unknown>,
): Partial<Record<PersonaField, string>> {
  const picked: Partial<Record<PersonaField, string>> = {};
  for (const field of PERSONA_FIELDS) {
    const value = input[field];
    if (typeof value === 'string') picked[field] = value;
  }
  return picked;
}

function normalizeFields(
  fields: Partial<Record<PersonaField, string>>,
): ToolResult<Partial<Record<PersonaField, string>>> {
  const data: Partial<Record<PersonaField, string>> = {};

  for (const field of TEXT_FIELDS) {
    const value = fields[field];
    if (value === undefined) continue;
    const trimmed = value.trim();
    if (trimmed.length > MAX_TEXT) {
      return { ok: false, message: TOO_LONG };
    }
    data[field] = trimmed;
  }

  for (const field of REQUIRED_TEXT) {
    if (data[field] === '') {
      return { ok: false, message: BLANK_REQUIRED };
    }
  }

  for (const field of Object.keys(ENUM_FIELDS) as Array<
    keyof typeof ENUM_FIELDS
  >) {
    const value = fields[field];
    if (value === undefined) continue;
    const allowed: readonly string[] = ENUM_FIELDS[field];
    if (!allowed.includes(value)) {
      return { ok: false, message: BAD_ENUM };
    }
    data[field] = value;
  }

  return { ok: true, data };
}

function mapPersona(value: unknown): PersonaView | null {
  if (value == null) return null;
  if (typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const persona = {} as PersonaView;
  for (const field of PERSONA_FIELDS) {
    const current = source[field];
    persona[field] = typeof current === 'string' ? current : null;
  }
  return persona;
}
