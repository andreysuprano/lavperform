import { WhatsappValidationProcessor } from 'src/customers/infrastructure/jobs/whatsapp-validation.processor';
import { Job } from 'bull';

describe('WhatsappValidationProcessor', () => {
  const whatsappService = {
    validateAndPersistCustomerWhatsapp: jest.fn(),
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
    processor = new WhatsappValidationProcessor(whatsappService as any);
  });

  it('delegates validation and returns false from the service', async () => {
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(false);

    const result = await processor.handleValidate(job);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledWith(
      'cust-1',
      '5511999999999',
    );
    expect(result).toEqual({ success: true, valid: false });
  });

  it('delegates validation and returns true from the service', async () => {
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(true);

    const result = await processor.handleValidate(job);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledWith(
      'cust-1',
      '5511999999999',
    );
    expect(result).toEqual({ success: true, valid: true });
  });

  it('rethrows API errors so the queue can retry', async () => {
    whatsappService.validateAndPersistCustomerWhatsapp.mockRejectedValue(new Error('down'));

    await expect(processor.handleValidate(job)).rejects.toThrow('down');
  });
});
