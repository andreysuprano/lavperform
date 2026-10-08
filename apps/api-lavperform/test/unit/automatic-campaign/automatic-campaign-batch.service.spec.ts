import { AutomaticCampaignSendMode, AutomaticCampaignStatus, AudienceTargetingMode, CampaignChannel, MessageStatus } from '@prisma/client';
import { BATCH_LEFT_ABORT_ERROR } from 'src/automatic-campaign/automatic-campaign.constants';
import { AutomaticCampaignBatchService } from 'src/automatic-campaign/application/automatic-campaign-batch.service';

const campaign = {
  id: 'ac1',
  companyId: 'comp1',
  targetingMode: AudienceTargetingMode.RFV,
  segmentation: 'hibernando',
  audienceId: null,
  customSendListId: null,
  channel: CampaignChannel.WHATSAPP_WEB,
  status: AutomaticCampaignStatus.IN_PROGRESS,
};

describe('AutomaticCampaignBatchService', () => {
  const tx = {
    automaticCampaignBatchRecipient: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    message: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    campaignMetric: { updateMany: jest.fn() },
    automaticCampaign: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const prisma: any = {
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    automaticCampaign: tx.automaticCampaign,
    automaticCampaignBatchRecipient: tx.automaticCampaignBatchRecipient,
    message: tx.message,
  };
  const resolver: any = { resolveCustomers: jest.fn() };
  let service: AutomaticCampaignBatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomaticCampaignBatchService(prisma, resolver);
  });

  it('resolves the full contactable audience without a daily cap', async () => {
    resolver.resolveCustomers.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    await expect(service.resolveContactableIds(campaign)).resolves.toEqual(['c1', 'c2']);
    expect(resolver.resolveCustomers).toHaveBeenCalledWith({
      companyId: 'comp1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'hibernando',
      audienceId: null,
      customSendListId: null,
      channel: CampaignChannel.WHATSAPP_WEB,
      eligibility: 'contactable',
    });
    expect(resolver.resolveCustomers.mock.calls[0][0].take).toBeUndefined();
  });

  it('replaces the batch, aborts pending outsiders, and stores the batch size', async () => {
    tx.message.findMany.mockResolvedValue([{ customerId: 'c1' }]);
    await service.commitBatch(campaign, ['c1', 'c2']);
    expect(tx.automaticCampaignBatchRecipient.deleteMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
    });
    expect(tx.automaticCampaignBatchRecipient.createMany).toHaveBeenCalledWith({
      data: [
        { automaticCampaignId: 'ac1', customerId: 'c1' },
        { automaticCampaignId: 'ac1', customerId: 'c2' },
      ],
    });
    expect(tx.message.updateMany).toHaveBeenCalledWith({
      where: {
        automaticCampaignId: 'ac1',
        status: MessageStatus.PENDING,
        customerId: { notIn: ['c1', 'c2'] },
      },
      data: { status: MessageStatus.ABORTED, error: BATCH_LEFT_ABORT_ERROR },
    });
    expect(tx.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
      data: { totalCustomers: 2 },
    });
    const data = tx.automaticCampaign.update.mock.calls[0][0].data;
    expect(data.batchSnapshottedAt).toEqual(expect.any(Date));
    expect(data.sendMode).toBe('COVER_BATCH');
    expect(data.status).toBeUndefined();
    expect(data.active).toBeUndefined();
  });

  it('completes an empty batch', async () => {
    await service.commitBatch(campaign, []);
    expect(tx.automaticCampaignBatchRecipient.createMany).not.toHaveBeenCalled();
    expect(tx.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: expect.objectContaining({
        status: AutomaticCampaignStatus.COMPLETED,
        active: false,
        batchSnapshottedAt: expect.any(Date),
      }),
    });
    expect(tx.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
      data: { totalCustomers: 0 },
    });
  });

  it('completes when every id already has SENT and does not reopen', async () => {
    tx.message.findMany.mockResolvedValue([{ customerId: 'c1' }]);
    await service.commitBatch(
      { ...campaign, status: AutomaticCampaignStatus.COMPLETED },
      ['c1'],
    );
    expect(tx.automaticCampaign.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: AutomaticCampaignStatus.COMPLETED,
        active: false,
      }),
    );
  });

  it('reopens a completed campaign when the new batch has someone without SENT', async () => {
    tx.message.findMany.mockResolvedValue([]);
    await service.commitBatch(
      { ...campaign, status: AutomaticCampaignStatus.COMPLETED },
      ['c-new'],
    );
    expect(tx.automaticCampaign.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: AutomaticCampaignStatus.IN_PROGRESS,
        active: true,
      }),
    );
  });

  it('does not reactivate an in-progress campaign that is still uncovered', async () => {
    tx.message.findMany.mockResolvedValue([]);
    await service.commitBatch(campaign, ['c1']);
    const data = tx.automaticCampaign.update.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
    expect(data.active).toBeUndefined();
  });

  it('clears the batch and reopens when switching to continuous', async () => {
    await service.clearContinuous('ac1', AutomaticCampaignStatus.COMPLETED);
    expect(tx.automaticCampaignBatchRecipient.deleteMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
    });
    expect(tx.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: {
        sendMode: 'CONTINUOUS',
        batchSnapshottedAt: null,
        status: AutomaticCampaignStatus.IN_PROGRESS,
        active: true,
      },
    });
  });

  it('does not reactivate a continuous campaign that was not completed', async () => {
    await service.clearContinuous('ac1', AutomaticCampaignStatus.IN_PROGRESS);
    expect(tx.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: {
        sendMode: 'CONTINUOUS',
        batchSnapshottedAt: null,
      },
    });
  });

  it('completes when every recipient has SENT', async () => {
    tx.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      sendMode: 'COVER_BATCH',
      batchSnapshottedAt: new Date(),
      status: AutomaticCampaignStatus.IN_PROGRESS,
    });
    tx.automaticCampaignBatchRecipient.findMany.mockResolvedValue([
      { customerId: 'c1' },
      { customerId: 'c2' },
    ]);
    tx.message.findMany.mockResolvedValue([
      { customerId: 'c1' },
      { customerId: 'c2' },
      { customerId: 'c2' },
    ]);
    await expect(service.completeIfCovered('ac1')).resolves.toBe(true);
    expect(tx.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: { status: AutomaticCampaignStatus.COMPLETED, active: false },
    });
  });

  it('does not complete when someone in the batch lacks SENT', async () => {
    tx.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      sendMode: 'COVER_BATCH',
      batchSnapshottedAt: new Date(),
      status: AutomaticCampaignStatus.IN_PROGRESS,
    });
    tx.automaticCampaignBatchRecipient.findMany.mockResolvedValue([
      { customerId: 'c1' },
      { customerId: 'c2' },
    ]);
    tx.message.findMany.mockResolvedValue([{ customerId: 'c1' }]);
    await expect(service.completeIfCovered('ac1')).resolves.toBe(false);
    expect(tx.automaticCampaign.update).not.toHaveBeenCalled();
  });

  it('returns failed and skips the commit when resolving the audience throws', async () => {
    resolver.resolveCustomers.mockRejectedValue(new Error('resolver down'));
    await expect(service.tryFreezeCoverBatch(campaign)).resolves.toBe('failed');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns failed when committing the batch throws', async () => {
    resolver.resolveCustomers.mockResolvedValue([{ id: 'c1' }]);
    prisma.$transaction.mockRejectedValueOnce(new Error('tx down'));
    await expect(service.tryFreezeCoverBatch(campaign)).resolves.toBe('failed');
  });

  it('returns frozen after committing the resolved ids', async () => {
    resolver.resolveCustomers.mockResolvedValue([{ id: 'c1' }]);
    tx.message.findMany.mockResolvedValue([]);
    await expect(service.tryFreezeCoverBatch(campaign)).resolves.toBe('frozen');
    expect(tx.automaticCampaignBatchRecipient.createMany).toHaveBeenCalled();
  });

  it('clears the batch when saving a continuous campaign', async () => {
    await service.syncAfterSave({
      ...campaign,
      sendMode: AutomaticCampaignSendMode.CONTINUOUS,
    });
    expect(tx.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: {
        sendMode: 'CONTINUOUS',
        batchSnapshottedAt: null,
      },
    });
  });

  it('saves a cover batch without throwing when the audience lookup fails', async () => {
    resolver.resolveCustomers.mockRejectedValue(new Error('resolver down'));
    await expect(
      service.syncAfterSave({
        ...campaign,
        sendMode: AutomaticCampaignSendMode.COVER_BATCH,
      }),
    ).resolves.toBeUndefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not complete a batch that was never snapshotted', async () => {
    tx.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      sendMode: 'COVER_BATCH',
      batchSnapshottedAt: null,
      status: AutomaticCampaignStatus.IN_PROGRESS,
    });
    await expect(service.completeIfCovered('ac1')).resolves.toBe(false);
    expect(tx.automaticCampaignBatchRecipient.findMany).not.toHaveBeenCalled();
  });
});
