import { lockCustomerCreateIdentities } from 'src/customers/application/customer-create-lock';

describe('lockCustomerCreateIdentities', () => {
  it('does not lock when phone and cpf are both null', async () => {
    const tx = { $executeRaw: jest.fn() };
    await lockCustomerCreateIdentities(tx as never, 'company-1', null, null);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('locks phone before cpf when both are present', async () => {
    const calls: string[] = [];
    const tx = {
      $executeRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push(String(values[1] ?? values[0]));
        return Promise.resolve(0);
      }),
    };
    await lockCustomerCreateIdentities(tx as never, 'co-1', '5511999', '12345678901');
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(calls[0]).toContain(':phone:5511999');
    expect(calls[1]).toContain(':cpf:12345678901');
  });
});
