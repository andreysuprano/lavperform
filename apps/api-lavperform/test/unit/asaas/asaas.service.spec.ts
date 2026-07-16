/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion */
import { of, throwError } from 'rxjs';
import { AsaasService } from 'src/integrations/asaas/api/asaas.service';

describe('AsaasService', () => {
  const httpService: any = {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  let service: AsaasService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ASAAS_BASE_URL = 'http://asaas';
    process.env.ASAAS_API_KEY = 'key';
    service = new AsaasService(httpService as any);
  });

  it('uses empty defaults when env vars are missing', async () => {
    delete process.env.ASAAS_BASE_URL;
    delete process.env.ASAAS_API_KEY;
    const serviceWithoutEnv = new AsaasService(httpService as any);
    httpService.get.mockReturnValue(of({ data: { ok: true } }));

    await serviceWithoutEnv.getSubscriptionDetails('sub');

    expect(httpService.get).toHaveBeenCalledWith(
      '/v3/subscriptions/sub',
      expect.objectContaining({
        headers: expect.objectContaining({ access_token: '' }),
      }),
    );
  });

  it('gets subscription details', async () => {
    httpService.get.mockReturnValue(of({ data: { id: 'sub' } }));
    await expect(service.getSubscriptionDetails('sub')).resolves.toEqual({
      id: 'sub',
    });
  });

  it('throws when subscription details request fails', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('fail')));
    await expect(service.getSubscriptionDetails('sub')).rejects.toThrow(
      /detalhes da assinatura/,
    );
  });

  it('gets subscription payments', async () => {
    httpService.get.mockReturnValue(of({ data: [{ id: 'p1' }] }));
    await expect(service.getSubscriptionPayments('sub')).resolves.toEqual([
      { id: 'p1' },
    ]);
  });

  it('throws when subscription payments request fails', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('fail')));
    await expect(service.getSubscriptionPayments('sub')).rejects.toThrow(
      /pagamentos/,
    );
  });

  it('gets payment barcode', async () => {
    httpService.get.mockReturnValue(of({ data: { bar: 1 } }));
    await expect(service.getPaymentBarCode('pay')).resolves.toEqual({ bar: 1 });
  });

  it('throws when barcode request fails', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('err')));
    await expect(service.getPaymentBarCode('pay')).rejects.toThrow(
      /pagamentos da assinatura/,
    );
  });

  it('gets payment pix QR code', async () => {
    httpService.get.mockReturnValue(of({ data: { pix: 1 } }));
    await expect(service.getPaymentPixQrCode('pay')).resolves.toEqual({
      pix: 1,
    });
  });

  it('throws when pix request fails', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('err')));
    await expect(service.getPaymentPixQrCode('pay')).rejects.toThrow(
      /pagamentos da assinatura/,
    );
  });

  it('gets payment details', async () => {
    httpService.get.mockReturnValue(of({ data: { id: 'pay' } }));
    await expect(service.getPaymentDetails('pay')).resolves.toEqual({
      id: 'pay',
    });
  });

  it('throws when payment details request fails', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('err')));
    await expect(service.getPaymentDetails('pay')).rejects.toThrow(
      /detalhes do pagamento/,
    );
  });

  it('creates payment', async () => {
    httpService.post.mockReturnValue(of({ data: { id: 'pay' } }));
    await expect(service.createPayment({} as any)).resolves.toEqual({
      id: 'pay',
    });
  });

  it('throws when create payment fails', async () => {
    httpService.post.mockReturnValue(
      throwError(() => ({ response: { data: { message: 'err' } } })),
    );
    await expect(service.createPayment({} as any)).rejects.toThrow(
      /criar a cobrança/,
    );
  });

  it('puts credit card into subscription', async () => {
    httpService.put.mockReturnValue(of({ data: { ok: true } }));
    await expect(
      service.putCreditCardInSubscription('sub', {} as any),
    ).resolves.toEqual({ ok: true });
  });

  it('throws when credit card put fails', async () => {
    httpService.put.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      service.putCreditCardInSubscription('sub', {} as any),
    ).rejects.toThrow(/cartão de crédito/);
  });

  it('updates subscription billing type', async () => {
    httpService.put.mockReturnValue(of({ data: { ok: true } }));
    await expect(
      service.putSubscriptionBillingType('sub', 'CREDIT'),
    ).resolves.toEqual({ ok: true });
  });

  it('throws when billing type update fails', async () => {
    httpService.put.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      service.putSubscriptionBillingType('sub', 'CREDIT'),
    ).rejects.toThrow(/faturamento/);
  });

  it('creates subscription', async () => {
    httpService.post.mockReturnValue(of({ data: { id: 'sub' } }));
    await expect(service.createSubscription({} as any)).resolves.toEqual({
      id: 'sub',
    });
  });

  it('throws when create subscription fails', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('fail')));
    await expect(service.createSubscription({} as any)).rejects.toThrow(
      /criar a assinatura/,
    );
  });

  it('creates customer', async () => {
    httpService.post.mockReturnValue(of({ data: { id: 'cust' } }));
    await expect(service.createCustomer({} as any)).resolves.toEqual({
      id: 'cust',
    });
  });

  it('throws when create customer fails', async () => {
    httpService.post.mockReturnValue(
      throwError(() => ({ response: { data: { message: 'err' } } })),
    );
    await expect(service.createCustomer({} as any)).rejects.toThrow(
      /criar o cliente/,
    );
  });

  it('updates subscription', async () => {
    httpService.put.mockReturnValue(of({ data: { id: 'sub', value: 99 } }));
    await expect(
      service.updateSubscription('sub', { value: 99 }),
    ).resolves.toEqual({ id: 'sub', value: 99 });
  });

  it('throws when update subscription fails', async () => {
    httpService.put.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      service.updateSubscription('sub', { value: 99 }),
    ).rejects.toThrow(/atualizar a assinatura/);
  });

  it('deletes subscription', async () => {
    httpService.delete.mockReturnValue(of({ data: { deleted: true } }));
    await expect(service.deleteSubscription('sub')).resolves.toEqual({
      deleted: true,
    });
  });

  it('receives payment in cash', async () => {
    httpService.post.mockReturnValue(of({ data: { status: 'RECEIVED_IN_CASH' } }));
    await expect(
      service.receivePaymentInCash('pay', {
        paymentDate: '2026-05-22',
        value: 100,
      }),
    ).resolves.toEqual({ status: 'RECEIVED_IN_CASH' });
  });

  it('deletes payment', async () => {
    httpService.delete.mockReturnValue(of({ data: { deleted: true } }));
    await expect(service.deletePayment('pay')).resolves.toEqual({
      deleted: true,
    });
  });

  it('refunds payment', async () => {
    httpService.post.mockReturnValue(of({ data: { status: 'REFUNDED' } }));
    await expect(
      service.refundPayment('pay', { value: 50, description: 'test' }),
    ).resolves.toEqual({ status: 'REFUNDED' });
  });

  it('updates payment', async () => {
    httpService.put.mockReturnValue(of({ data: { id: 'pay', value: 80 } }));
    await expect(
      service.updatePayment('pay', { value: 80 }),
    ).resolves.toEqual({ id: 'pay', value: 80 });
  });
});
