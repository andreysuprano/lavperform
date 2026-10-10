import { ToolExecutorService } from './tool-executor.service';
import type { AgentTool, ToolExecutionContext } from './tool.interface';

const context: ToolExecutionContext = {
  companyId: 'company-1',
  agentId: 'agent-1',
  senderPhone: '5511999999999',
  conversationId: 'conv-1',
};

function call(name: string, args = '{}') {
  return [{ id: 'call-1', type: 'function' as const, function: { name, arguments: args } }];
}

describe('ToolExecutorService', () => {
  const originalTimeout = process.env.AGENT_TOOL_TIMEOUT_MS;
  const originalAttempts = process.env.AGENT_TOOL_ATTEMPTS;

  afterEach(() => {
    if (originalTimeout === undefined) delete process.env.AGENT_TOOL_TIMEOUT_MS;
    else process.env.AGENT_TOOL_TIMEOUT_MS = originalTimeout;
    if (originalAttempts === undefined) delete process.env.AGENT_TOOL_ATTEMPTS;
    else process.env.AGENT_TOOL_ATTEMPTS = originalAttempts;
  });

  it('repete uma ferramenta quando a falha é de rede', async () => {
    const tool: AgentTool = {
      name: 'buscar_pedido',
      description: '',
      inputSchema: {},
      execute: jest
        .fn()
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce({ pedido: '123' }),
    };
    const registry = { get: jest.fn().mockReturnValue(tool) };
    const service = new ToolExecutorService(registry as never);

    const [result] = await service.execute(call('buscar_pedido'), context);

    expect(tool.execute).toHaveBeenCalledTimes(2);
    expect(result.content).toContain('123');
    expect(result.errorMessage).toBeUndefined();
  });

  it('não repete um erro de argumento e esconde o detalhe técnico', async () => {
    const tool: AgentTool = {
      name: 'buscar_pedido',
      description: '',
      inputSchema: {},
      execute: jest.fn().mockRejectedValue(new Error('campo obrigatório')),
    };
    const registry = { get: jest.fn().mockReturnValue(tool) };
    const service = new ToolExecutorService(registry as never);

    const [result] = await service.execute(call('buscar_pedido', '{'), context);

    expect(tool.execute).not.toHaveBeenCalled();
    expect(result.content).toContain('Não foi possível concluir essa ação agora');
    expect(result.content).not.toContain('JSON');
    expect(result.errorMessage).toBeTruthy();
  });

  it('interrompe uma ferramenta que não responde e tenta de novo', async () => {
    process.env.AGENT_TOOL_TIMEOUT_MS = '30';
    const tool: AgentTool = {
      name: 'buscar_pedido',
      description: '',
      inputSchema: {},
      execute: jest.fn().mockImplementation(() => new Promise(() => undefined)),
    };
    const registry = { get: jest.fn().mockReturnValue(tool) };
    const service = new ToolExecutorService(registry as never);

    const [result] = await service.execute(call('buscar_pedido'), context);

    expect(tool.execute).toHaveBeenCalledTimes(2);
    expect(result.content).toContain('Não foi possível concluir essa ação agora');
    expect(result.errorMessage).toBe('A ferramenta demorou demais');
  });

  it('não repete o pedido de ajuda humana', async () => {
    process.env.AGENT_TOOL_TIMEOUT_MS = '30';
    const tool: AgentTool = {
      name: 'request_human_help',
      description: '',
      inputSchema: {},
      execute: jest.fn().mockImplementation(() => new Promise(() => undefined)),
    };
    const registry = { get: jest.fn().mockReturnValue(tool) };
    const service = new ToolExecutorService(registry as never);

    const [result] = await service.execute(call('request_human_help'), context);

    expect(tool.execute).toHaveBeenCalledTimes(1);
    expect(result.content).toContain('Não foi possível concluir essa ação agora');
  });
});
