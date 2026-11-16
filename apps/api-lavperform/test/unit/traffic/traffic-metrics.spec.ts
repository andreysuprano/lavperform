import {
  formatTrafficInteger,
  formatTrafficMoney,
  formatTrafficRoas,
  metricsFromInsight,
  sumTrafficMetrics,
  zeroTrafficMetrics,
} from 'src/traffic/domain/traffic-metrics';

describe('metricsFromInsight', () => {
  it('lê purchase, carrinho, link e conversa', () => {
    const metrics = metricsFromInsight({
      spend: '10.5',
      impressions: '100',
      reach: '40',
      clicks: '7',
      inline_link_clicks: '4',
      actions: [
        { action_type: 'purchase', value: '2' },
        { action_type: 'add_to_cart', value: '3' },
        { action_type: 'like', value: '5' },
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' },
      ],
      action_values: [
        { action_type: 'purchase', value: '25.5' },
        { action_type: 'add_to_cart', value: '30' },
      ],
    });
    expect(metrics.spend).toBe(10.5);
    expect(metrics.purchases).toBe(2);
    expect(metrics.revenue).toBe(25.5);
    expect(metrics.addToCart).toBe(3);
    expect(metrics.cartValue).toBe(30);
    expect(metrics.roas).toBeCloseTo(25.5 / 10.5);
    expect(metrics.costPerPurchase).toBeCloseTo(10.5 / 2);
    expect(metrics.linkClicks).toBe(4);
    expect(metrics.likes).toBe(5);
    expect(metrics.conversations).toBe(1);
  });

  it('zera action ausente, valor inválido e spend zero no ROAS', () => {
    const metrics = metricsFromInsight({ spend: 'nan', actions: [{ action_type: 'purchase', value: 'x' }] });
    expect(metrics).toEqual(zeroTrafficMetrics());
  });
});

describe('sumTrafficMetrics', () => {
  it('recalcula ROAS e custo por compra a partir das somas', () => {
    const total = sumTrafficMetrics([
      { ...zeroTrafficMetrics(), spend: 10, revenue: 5, purchases: 1, roas: 9, costPerPurchase: 9 },
      { ...zeroTrafficMetrics(), spend: 10, revenue: 15, purchases: 1, roas: 9, costPerPurchase: 9 },
    ]);
    expect(total.spend).toBe(20);
    expect(total.revenue).toBe(20);
    expect(total.roas).toBe(1);
    expect(total.costPerPurchase).toBe(10);
  });
});

describe('formatTrafficMoney', () => {
  it('formata BRL e cola o sinal no símbolo', () => {
    expect(formatTrafficMoney(1234.56, 'BRL')).toBe('R$ 1.234,56');
    expect(formatTrafficMoney(-2, 'BRL')).toBe('-R$ 2,00');
    expect(formatTrafficMoney(2, 'USD')).toBe('USD 2,00');
  });
});

describe('formatos inteiro e ROAS', () => {
  it('usa pt-BR e 2.00x', () => {
    expect(formatTrafficInteger(1234)).toBe('1.234');
    expect(formatTrafficRoas(2)).toBe('2.00x');
  });
});
