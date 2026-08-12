import { AiAgentService } from 'src/ai-agent/application/ai-agent.service';

describe('AiAgentService - setupAgentWebhook', () => {
  const prisma: any = {
    company: { findUnique: jest.fn(), findFirst: jest.fn() },
    whatsappInstance: { findUnique: jest.fn() },
  };

  const lavaiAgentApi: any = {
    createAgent: jest.fn(),
  };

  const uazapiClient: any = {
    getWebhooks: jest.fn(),
    setWebhook: jest.fn(),
  };

  const configService: any = {
    get: jest.fn((key: string) =>
      key === 'LAVAI_AGENT_WEBHOOK_BASE_URL' ? 'https://public.example.com' : undefined,
    ),
  };

  let service: AiAgentService;

  const PUBLIC_URL = 'https://public.example.com/webhooks/over1/agent1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiAgentService(prisma, lavaiAgentApi, uazapiClient, configService);

    prisma.company.findUnique = jest
      .fn()
      .mockResolvedValue({ overAgentCompanyId: 'over1' });
    prisma.whatsappInstance.findUnique = jest
      .fn()
      .mockResolvedValue({ token: 'tok', name: 'inst' });
    lavaiAgentApi.createAgent = jest
      .fn()
      .mockResolvedValue({ id: 'agent1', companyId: 'over1' });
    uazapiClient.setWebhook = jest.fn().mockResolvedValue(undefined);
  });

  it('skips when a webhook with the correct url already exists', async () => {
    uazapiClient.getWebhooks = jest
      .fn()
      .mockResolvedValue([{ id: 'w1', url: PUBLIC_URL }]);

    await service.createAgent('compInternal', {} as any);

    expect(uazapiClient.setWebhook).not.toHaveBeenCalled();
  });

  it('removes a stale localhost webhook and recreates with the public url', async () => {
    uazapiClient.getWebhooks = jest.fn().mockResolvedValue([
      { id: 'w1', url: 'http://localhost:3000/webhooks/over1/agent1' },
    ]);

    await service.createAgent('compInternal', {} as any);

    expect(uazapiClient.setWebhook).toHaveBeenCalledWith(
      'tok',
      'http://localhost:3000/webhooks/over1/agent1',
      ['messages'],
      { action: 'delete', id: 'w1' },
    );
    expect(uazapiClient.setWebhook).toHaveBeenCalledWith(
      'tok',
      PUBLIC_URL,
      ['messages'],
      { action: 'add', excludeMessages: ['wasSentByApi', 'isGroupYes'] },
    );
  });

  it('creates the webhook when none exists', async () => {
    uazapiClient.getWebhooks = jest.fn().mockResolvedValue([]);

    await service.createAgent('compInternal', {} as any);

    expect(uazapiClient.setWebhook).toHaveBeenCalledTimes(1);
    expect(uazapiClient.setWebhook).toHaveBeenCalledWith(
      'tok',
      PUBLIC_URL,
      ['messages'],
      { action: 'add', excludeMessages: ['wasSentByApi', 'isGroupYes'] },
    );
  });

  it('does not touch webhooks that belong to other agents', async () => {
    uazapiClient.getWebhooks = jest.fn().mockResolvedValue([
      { id: 'w2', url: 'http://localhost:3000/webhooks/over1/other-agent' },
    ]);

    await service.createAgent('compInternal', {} as any);

    expect(uazapiClient.setWebhook).toHaveBeenCalledTimes(1);
    expect(uazapiClient.setWebhook).toHaveBeenCalledWith(
      'tok',
      PUBLIC_URL,
      ['messages'],
      { action: 'add', excludeMessages: ['wasSentByApi', 'isGroupYes'] },
    );
  });
});
