import {
  mapIngestCustomerToCreateDto,
  mapIngestCustomerToUpdateDto,
  mapIngestOrderToCreateDto,
} from 'src/public-api/orders/application/order-ingestion.mapper';

describe('order-ingestion.mapper', () => {
  const ctx = {
    apiKeyId: 'key-1',
    companyId: 'company-1',
  };

  it('mapeia customer apenas com cpf', () => {
    const dto = mapIngestCustomerToCreateDto({
      name: 'Maria',
      cpf: '123.456.789-00',
    });

    expect(dto.phone).toBeUndefined();
    expect(dto.cpf).toBe('12345678900');
  });

  it('atualiza customer existente com novos dados', () => {
    const updateDto = mapIngestCustomerToUpdateDto(
      {
        name: 'João',
        phone: '5511999999999',
        email: null,
        cpf: null,
        birthDate: null,
        gender: null,
      },
      {
        name: 'João Silva',
        phone: '41988887777',
        email: 'joao@exemplo.com',
      },
    );

    expect(updateDto.name).toBe('João Silva');
    expect(updateDto.phone).toBe('5541988887777');
    expect(updateDto.email).toBe('joao@exemplo.com');
  });

  it('mapeia order usando public_api quando salesChannel é omitido', () => {
    const orderDto = mapIngestOrderToCreateDto(
      {
        externalOrderId: 'ext-1',
        displayId: 10,
        status: 'closed',
        orderType: 'delivery',
        orderTiming: 'instant',
        deliveryFee: 0,
        serviceFee: 0,
        additionalFee: 0,
        total: 50,
        customer: { name: 'João', phone: '41999999999' },
        createdAt: '2026-06-18T18:30:00.000Z',
        updatedAt: '2026-06-18T18:30:00.000Z',
      },
      ctx,
      'customer-1',
    );

    expect(orderDto.salesChannel).toBe('public_api');
    expect(orderDto.partnerId).toBeUndefined();
    expect(orderDto.externalOrderId).toBe('ext-1');
  });

  it('mapeia order com partnerId e usa slug do partner como salesChannel', () => {
    const orderDto = mapIngestOrderToCreateDto(
      {
        externalOrderId: 'ext-2',
        displayId: 11,
        status: 'closed',
        orderType: 'delivery',
        orderTiming: 'instant',
        partnerId: 'partner-1',
        deliveryFee: 0,
        serviceFee: 0,
        additionalFee: 0,
        total: 50,
        customer: { name: 'João', phone: '41999999999' },
        createdAt: '2026-06-18T18:30:00.000Z',
        updatedAt: '2026-06-18T18:30:00.000Z',
      },
      ctx,
      'customer-1',
      { partnerSlug: 'ifood', name: 'iFood' },
    );

    expect(orderDto.partnerId).toBe('partner-1');
    expect(orderDto.salesChannel).toBe('ifood');
  });
});
