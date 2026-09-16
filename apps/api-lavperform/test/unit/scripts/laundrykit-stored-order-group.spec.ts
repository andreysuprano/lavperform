import {
  itemFingerprint,
  laundryKitStoredOrderGroupKey,
  pickKeptLaundryKitOrder,
} from 'src/scripts/laundrykit/laundrykit-stored-order-group';

describe('laundryKitStoredOrderGroupKey', () => {
  it('agrupa OP_IDs do mesmo prefixo T', () => {
    expect(
      laundryKitStoredOrderGroupKey({
        externalOrderId: 'T1789561423975_59fb185c-899d-4c0f-9cc3-19c4bb91b8bf',
      }),
    ).toBe('T1789561423975');
    expect(
      laundryKitStoredOrderGroupKey({
        externalOrderId: 'T1789561423975_a9e31773-0f2a-4f94-a99d-b499d4bb9811',
      }),
    ).toBe('T1789561423975');
  });

  it('não junta vendas do mesmo cliente com prefixos diferentes', () => {
    expect(
      laundryKitStoredOrderGroupKey({
        externalOrderId: 'T1789534833091_92028621-3d6d-447b-b730-9573bddf0a52',
      }),
    ).toBe('T1789534833091');
    expect(
      laundryKitStoredOrderGroupKey({
        externalOrderId: 'T1789534945215_37cb7be1-1ef0-4259-b6ce-51e9c8d5bcb2',
      }),
    ).toBe('T1789534945215');
  });

  it('cai no Auth da observation quando não há externalOrderId', () => {
    expect(
      laundryKitStoredOrderGroupKey({
        observation: 'Máquina: Lavadora 3 | Auth: 35963348133309',
      }),
    ).toBe('35963348133309');
  });
});

describe('pickKeptLaundryKitOrder', () => {
  it('prefere o pedido que já tem o externalOrderId do grupo', () => {
    const kept = pickKeptLaundryKitOrder(
      [
        {
          id: 'old-op',
          createdAt: new Date('2026-09-16T12:00:00Z'),
          externalOrderId: 'T1_aaa',
        },
        {
          id: 'grouped',
          createdAt: new Date('2026-09-16T13:00:00Z'),
          externalOrderId: 'T1',
        },
      ],
      'T1',
    );
    expect(kept.id).toBe('grouped');
  });

  it('senão mantém o mais antigo', () => {
    const kept = pickKeptLaundryKitOrder(
      [
        {
          id: 'b',
          createdAt: new Date('2026-09-16T13:00:00Z'),
          externalOrderId: 'T1_b',
        },
        {
          id: 'a',
          createdAt: new Date('2026-09-16T12:00:00Z'),
          externalOrderId: 'T1_a',
        },
      ],
      'T1',
    );
    expect(kept.id).toBe('a');
  });
});

describe('itemFingerprint', () => {
  it('usa equipamento para não duplicar máquina no merge', () => {
    expect(
      itemFingerprint({
        externalCode: 'Laundry_IOT_M_1338',
        observation: 'Lavadora 3',
        name: 'Lavagem',
      }),
    ).toBe('laundry_iot_m_1338');
  });
});
