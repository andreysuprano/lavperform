import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  MCP_SERVER_REPOSITORY,
  McpTransport,
} from '../../../mcp/ports/mcp-server.repository.port';
import type {
  McpServerRepositoryPort,
  McpServerData,
} from '../../../mcp/ports/mcp-server.repository.port';
import type { AgentTool, ToolExecutionContext } from '../tool.interface';

/**
 * Tool dinâmica que representa uma tool exposta por um servidor MCP.
 * Mantém referência ao Client MCP para executar chamadas.
 */
class McpDynamicTool implements AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  private readonly originalName: string;

  constructor(
    private readonly client: Client,
    safeName: string,
    originalName: string,
    description: string,
    inputSchema: object,
  ) {
    this.name = safeName;
    this.originalName = originalName;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  async execute(input: unknown, _context: ToolExecutionContext): Promise<unknown> {
    const result = await this.client.callTool({
      name: this.originalName,
      arguments: input as Record<string, unknown>,
    });
    return result.content;
  }
}

export interface McpSession {
  serverName: string;
  client: Client;
  tools: AgentTool[];
}

@Injectable()
export class McpToolLoaderService {
  private readonly logger = new Logger(McpToolLoaderService.name);

  constructor(
    @Inject(MCP_SERVER_REPOSITORY)
    private readonly mcpServerRepo: McpServerRepositoryPort,
  ) {}

  /**
   * Conecta a todos os servidores MCP habilitados do agente,
   * descobre as tools disponíveis e retorna sessões abertas.
   * O chamador é responsável por chamar `closeSessions` ao final.
   */
  async openSessionsForAgent(agentId: string): Promise<McpSession[]> {
    const servers = await this.mcpServerRepo.findEnabledByAgent(agentId);
    if (servers.length === 0) return [];

    const sessions: McpSession[] = [];

    for (const server of servers) {
      try {
        const session = await this.connectToServer(server);
        if (session) sessions.push(session);
      } catch (err) {
        this.logger.warn(
          `[MCP] Falha ao conectar ao servidor "${server.name}" (${server.id}): ${String(err)}`,
        );
      }
    }

    return sessions;
  }

  /** Fecha todas as sessões abertas (desconecta dos servidores MCP). */
  async closeSessions(sessions: McpSession[]): Promise<void> {
    for (const session of sessions) {
      try {
        await session.client.close();
        this.logger.debug(`[MCP] Sessão encerrada: ${session.serverName}`);
      } catch (err) {
        this.logger.warn(`[MCP] Erro ao encerrar sessão "${session.serverName}": ${String(err)}`);
      }
    }
  }

  private async connectToServer(server: McpServerData): Promise<McpSession | null> {
    const client = new Client(
      { name: 'lavai-agent', version: '1.0.0' },
      { capabilities: {} },
    );

    let transport: StdioClientTransport | SSEClientTransport;

    if (server.transport === McpTransport.STDIO) {
      if (!server.command) {
        this.logger.warn(`[MCP] Servidor STDIO "${server.name}" sem comando configurado. Ignorando.`);
        return null;
      }

      transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: { ...process.env, ...server.env } as Record<string, string>,
      });
    } else {
      if (!server.url) {
        this.logger.warn(`[MCP] Servidor SSE "${server.name}" sem URL configurada. Ignorando.`);
        return null;
      }

      transport = new SSEClientTransport(new URL(server.url), {
        requestInit: {
          headers: server.headers,
        },
        eventSourceInit: {
          fetch: (url: string | URL, init?: RequestInit) =>
            fetch(url, { ...init, headers: { ...server.headers, ...(init?.headers as Record<string, string> ?? {}) } }),
        },
      });
    }

    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const tools: AgentTool[] = toolsResponse.tools.map((t) => {
      const safeName = `mcp_${server.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${t.name}`;
      return new McpDynamicTool(
        client,
        safeName,
        t.name,
        `[MCP: ${server.name}] ${t.description ?? t.name}`,
        (t.inputSchema ?? { type: 'object', properties: {} }) as object,
      );
    });

    this.logger.log(
      `[MCP] Servidor "${server.name}" conectado | ${tools.length} tool(s): ${tools.map((t) => t.name).join(', ')}`,
    );

    return { serverName: server.name, client, tools };
  }
}
