import { WhatsappValidationProcessor } from 'src/customers/infrastructure/jobs/whatsapp-validation.processor';
import { Job } from 'bull';

describe('WhatsappValidationProcessor', () => {
  const prisma = {
    customer: {
      update: jest.fn(),
    },
  };
  const whatsappService = {
    checkWhatsappNumber: jest.fn(),
  };

  let processor: WhatsappValidationProcessor;

  const job = {
    data: {
      customerId: 'cust-1',
      companyId: 'comp-1',
      phone: '5511999999999',
    },
  } as Job<{ customerId: string; companyId: string; phone: string }>;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new WhatsappValidationProcessor(prisma as any, whatsappService as any);
  });

  it('persists exists:false and completes the job', async () => {
    whatsappService.checkWhatsappNumber.mockResolvedValue(false);
    prisma.customer.update.mockResolvedValue({});

    const result = await processor.handleValidate(job);

    expect(whatsappService.checkWhatsappNumber).toHaveBeenCalledWith('5511999999999');
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'cust-1' },
      data: {
        whatsappVerified: false,
        whatsappVerifiedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ success: true, valid: false });
  });

  it('rethrows API errors so the queue can retry', async () => {
    whatsappService.checkWhatsappNumber.mockRejectedValue(new Error('down'));

    await expect(processor.handleValidate(job)).rejects.toThrow('down');
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });
});
