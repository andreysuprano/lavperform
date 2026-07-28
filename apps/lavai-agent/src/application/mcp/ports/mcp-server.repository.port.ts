export const MCP_SERVER_REPOSITORY = Symbol('MCP_SERVER_REPOSITORY');

export enum McpTransport {
  STDIO = 'STDIO',
  SSE = 'SSE',
}

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface McpServerData {
  id: string;
  agentId: string;
  name: string;
  transport: McpTransport;
  enabled: boolean;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  url: string | null;
  headers: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateMcpServerInput {
  agentId: string;
  name: string;
  transport: McpTransport;
  enabled?: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface UpdateMcpServerInput {
  name?: string;
  transport?: McpTransport;
  enabled?: boolean;
  command?: string | null;
  args?: string[];
  env?: Record<string, string>;
  url?: string | null;
  headers?: Record<string, string>;
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface McpServerRepositoryPort {
  create(input: CreateMcpServerInput): Promise<McpServerData>;
  findById(id: string): Promise<McpServerData | null>;
  findAllByAgent(agentId: string): Promise<McpServerData[]>;
  findEnabledByAgent(agentId: string): Promise<McpServerData[]>;
  update(id: string, input: UpdateMcpServerInput): Promise<McpServerData>;
  delete(id: string): Promise<void>;
}
