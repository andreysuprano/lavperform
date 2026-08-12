import { WhatsappInstanceStatus } from '@prisma/client';
import { WhatsappAgentWebhookSyncTasks } from 'src/whatsapp/crons/whatsapp-agent-webhook-sync.tasks';

describe('WhatsappAgentWebhookSyncTasks', () => {
  const prisma: any = {
    whatsappInstance: {
      findMany: jest.fn(),
    },
  };

  const aiAgentService: any = {
    ensureActiveAgentWebhook: jest.fn(),
  };

  let task: WhatsappAgentWebhookSyncTasks;

  beforeEach(() => {
    jest.clearAllMocks();
    task = new WhatsappAgentWebhookSyncTasks(prisma, aiAgentService);
  });

  it('ensures agent webhook for every connected instance', async () => {
    prisma.whatsappInstance.findMany = jest.fn().mockResolvedValue([
      { id: 'inst1', companyId: 'company1', name: 'a' },
      { id: 'inst2', companyId: 'company2', name: 'b' },
    ]);

    await task.ensureConnectedInstancesAgentWebhook();

    expect(prisma.whatsappInstance.findMany).toHaveBeenCalledWith({
      where: { status: WhatsappInstanceStatus.CONNECTED },
      select: { id: true, companyId: true, name: true },
    });
    expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledTimes(2);
    expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledWith('company1');
    expect(aiAgentService.ensureActiveAgentWebhook).toHaveBeenCalledWith('company2');
  });

  it('no-ops when there are no connected instances', async () => {
    prisma.whatsappInstance.findMany = jest.fn().mockResolvedValue([]);

    await task.ensureConnectedInstancesAgentWebhook();

    expect(aiAgentService.ensureActiveAgentWebhook).not.toHaveBeenCalled();
  });
});
