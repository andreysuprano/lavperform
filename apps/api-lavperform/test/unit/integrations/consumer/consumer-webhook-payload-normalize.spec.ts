import {
  deepLowercaseObjectKeys,
  isConsumerPayloadReadyForPersistence,
  normalizeConsumerWebhookPayload,
} from 'src/integrations/consumer/utils/consumer-webhook-payload-normalize';

describe('consumer-webhook-payload-normalize', () => {
  it('normaliza chaves PascalCase para o formato esperado pelo mapeamento', () => {
    const body = {
      Tipo: 'delivery',
      Pedido: {
        Codigo: '1',
        Datafechamento: '2026-01-01 10:00:00',
      },
      Delivery: { Status: 'f' },
    };
    const payload = normalizeConsumerWebhookPayload(body as Record<string, unknown>);
    expect(payload.tipo).toBe('delivery');
    expect(payload.pedido?.codigo).toBe('1');
    expect(payload.pedido?.datafechamento).toBe('2026-01-01 10:00:00');
    expect(payload.delivery?.status).toBe('f');
  });

  it('deepLowercaseObjectKeys não altera valores primitivos', () => {
    expect(deepLowercaseObjectKeys('x')).toBe('x');
    expect(deepLowercaseObjectKeys(null)).toBeNull();
  });

  it('isConsumerPayloadReadyForPersistence aceita status F case-insensitive', () => {
    expect(
      isConsumerPayloadReadyForPersistence({
        tipo: 'delivery',
        pedido: { datafechamento: '2026-01-01', codigo: '1' },
        delivery: { status: 'f' },
      }),
    ).toBe(true);
  });

  it('isConsumerPayloadReadyForPersistence aceita delivery ausente quando pedido está fechado', () => {
    expect(
      isConsumerPayloadReadyForPersistence({
        tipo: 'delivery',
        pedido: { datafechamento: '2026-01-01', codigo: '1' },
      }),
    ).toBe(true);
  });

  it('isConsumerPayloadReadyForPersistence rejeita delivery com status não final', () => {
    expect(
      isConsumerPayloadReadyForPersistence({
        tipo: 'delivery',
        pedido: { datafechamento: '2026-01-01', codigo: '1' },
        delivery: { status: 'A' },
      }),
    ).toBe(false);
  });

  it('isConsumerPayloadReadyForPersistence rejeita sem datafechamento', () => {
    expect(
      isConsumerPayloadReadyForPersistence({
        tipo: 'delivery',
        pedido: { codigo: '1' },
        delivery: { status: 'F' },
      }),
    ).toBe(false);
  });
});
