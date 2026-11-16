import { MessageStatus } from '@prisma/client';
import { AdminCompanyCustomerBaseService } from 'src/admin/companies/admin-company-customer-base.service';

const COMPANY_ID = 'company-1';

function createHarness(customers: Array<{ id: string; addressId: string | null }>) {
  const tx = {
    message: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    customer: {
      findMany: jest.fn().mockResolvedValue(customers),
      deleteMany: jest.fn().mockResolvedValue({ count: customers.length }),
    },
    automaticCampaignBatchRecipient: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    customerMergeReview: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    address: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new AdminCompanyCustomerBaseService(prisma as never);
  return { service, tx, prisma };
}

describe('AdminCompanyCustomerBaseService', () => {
  it('apaga os clientes, cancela envios abertos e remove só os endereços deles', async () => {
    const { service, tx, prisma } = createHarness([
      { id: 'c1', addressId: 'a1' },
      { id: 'c2', addressId: null },
    ]);

    const result = await service.purge(COMPANY_ID);

    expect(result).toEqual({ deletedCustomers: 2, abortedMessages: 2 });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 180_000,
    });
    expect(tx.message.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: COMPANY_ID,
        status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
      },
      data: {
        status: MessageStatus.ABORTED,
        error: 'Base de clientes removida',
      },
    });
    expect(tx.automaticCampaignBatchRecipient.deleteMany).toHaveBeenCalledWith({
      where: { customerId: { in: ['c1', 'c2'] } },
    });
    expect(tx.customerMergeReview.deleteMany).toHaveBeenCalledWith({
      where: { companyId: COMPANY_ID },
    });
    expect(tx.customer.deleteMany).toHaveBeenCalledWith({
      where: { companyId: COMPANY_ID },
    });
    expect(tx.address.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['a1'] },
        company: { is: null },
        customer: { is: null },
      },
    });
    expect(tx.customer.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.address.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it('não mexe em lote nem endereço quando a empresa não tem clientes', async () => {
    const { service, tx } = createHarness([]);

    const result = await service.purge(COMPANY_ID);

    expect(result).toEqual({ deletedCustomers: 0, abortedMessages: 2 });
    expect(tx.message.updateMany).toHaveBeenCalled();
    expect(tx.customer.deleteMany).toHaveBeenCalledWith({
      where: { companyId: COMPANY_ID },
    });
    expect(tx.automaticCampaignBatchRecipient.deleteMany).not.toHaveBeenCalled();
    expect(tx.address.deleteMany).not.toHaveBeenCalled();
  });
});
