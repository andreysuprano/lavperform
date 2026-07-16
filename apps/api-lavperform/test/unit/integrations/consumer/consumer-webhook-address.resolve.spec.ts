import {
  customerNeedsAddressBackfill,
  resolveConsumerPhysicalAddress,
  resolvedAddressToCustomerDto,
} from 'src/integrations/consumer/utils/consumer-webhook-address.resolve';
import type { ConsumerWebhookPayload } from 'src/integrations/consumer/dto/consumer-webhook-payload.interface';

describe('resolveConsumerPhysicalAddress', () => {
  it('prioriza objeto endereco na raiz', () => {
    const payload: ConsumerWebhookPayload = {
      endereco: {
        logradouro: 'Rua A',
        numero: '1',
        bairro: 'Centro',
        cidade: 'BH',
        uf: 'MG',
      },
      delivery: {
        endereco: 'Rua do Delivery',
        endereconumero: '99',
        bairro: 'Outro',
        cidade: 'Outra',
        uf: 'SP',
      },
    };
    const r = resolveConsumerPhysicalAddress(payload);
    expect(r?.street).toBe('Rua A');
    expect(r?.number).toBe('1');
  });

  it('usa endereço achatado do delivery quando raiz não tem linhas', () => {
    const payload: ConsumerWebhookPayload = {
      delivery: {
        status: 'F',
        endereco: 'Rua Albert Scharlet',
        endereconumero: '1385',
        bairro: 'Centro',
        cidade: 'Coronel Fabriciano',
        uf: 'MG',
        cep: '35170-038',
      },
    };
    const r = resolveConsumerPhysicalAddress(payload);
    expect(r?.street).toBe('Rua Albert Scharlet');
    expect(r?.number).toBe('1385');
    expect(r?.zipCode).toBe('35170-038');
  });

  it('retorna undefined sem endereco útil', () => {
    expect(resolveConsumerPhysicalAddress({})).toBeUndefined();
    expect(
      resolveConsumerPhysicalAddress({
        endereco: {},
        delivery: { status: 'F' },
      }),
    ).toBeUndefined();
  });
});

describe('resolvedAddressToCustomerDto', () => {
  it('mapeia para DTO de cliente', () => {
    const dto = resolvedAddressToCustomerDto({
      street: 'Rua X',
      number: '10',
      neighborhood: 'B',
      city: 'C',
      state: 'MG',
      zipCode: '30000-000',
    });
    expect(dto.street).toBe('Rua X');
    expect(dto.zipCode).toBe('30000-000');
  });
});

describe('customerNeedsAddressBackfill', () => {
  it('true sem addressId', () => {
    expect(customerNeedsAddressBackfill({ addressId: null })).toBe(true);
  });

  it('true com endereço vazio', () => {
    expect(
      customerNeedsAddressBackfill({
        addressId: 'a1',
        address: {
          street: '',
          city: '',
          neighborhood: '  ',
        },
      }),
    ).toBe(true);
  });

  it('false quando já há linha preenchida', () => {
    expect(
      customerNeedsAddressBackfill({
        addressId: 'a1',
        address: { street: 'Rua', city: '', neighborhood: '' },
      }),
    ).toBe(false);
  });
});
