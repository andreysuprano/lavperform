import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  PublicAgentMcpService,
  PublicAgentSession,
  ToolResult,
} from '../application/public-agent-mcp.service';

const personaFields = {
  personaName: z.string().optional(),
  personaDescription: z.string().optional(),
  systemPrompt: z.string().optional(),
  behaviorGuidelines: z.string().optional(),
  guardrails: z.string().optional(),
  contextPrompt: z.string().optional(),
  welcomeMessage: z.string().optional(),
  messageSignature: z.string().optional(),
  voiceTone: z.string().optional(),
  communicationStyle: z.string().optional(),
  language: z.string().optional(),
};

export function createPublicAgentMcpServer(
  service: PublicAgentMcpService,
  session: PublicAgentSession,
): McpServer {
  const server = new McpServer({
    name: 'lavperform-public-agents',
    version: '1.0.0',
  });

  server.registerTool(
    'list_public_agents',
    {
      description:
        'Lista os agentes públicos da empresa desta sessão. Devolve id, nome, descrição e se está ativo.',
    },
    async () => toContent(await service.list(session)),
  );

  server.registerTool(
    'get_public_agent_persona',
    {
      description:
        'Lê a persona de um agente público desta empresa. persona vem null se ainda não existir.',
      inputSchema: { agentId: z.string() },
    },
    async ({ agentId }) =>
      toContent(await service.getPersona(session, agentId)),
  );

  server.registerTool(
    'update_public_agent_persona',
    {
      description:
        'Atualiza só os campos enviados da persona de um agente público desta empresa. Campo opcional vazio limpa o valor. Nome e prompt de sistema não podem ficar em branco.',
      inputSchema: { agentId: z.string(), ...personaFields },
    },
    async ({ agentId, ...fields }) =>
      toContent(await service.updatePersona(session, agentId, fields)),
  );

  return server;
}

function toContent(result: ToolResult<unknown>) {
  if (!result.ok) {
    return {
      isError: true as const,
      content: [{ type: 'text' as const, text: result.message }],
    };
  }
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
  };
}
