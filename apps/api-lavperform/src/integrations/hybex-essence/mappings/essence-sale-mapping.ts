import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { CreateOrderItemDto } from '../../../orders/application/dto/create-order-item.dto';
import {
  EssenceCliente,
  EssenceTicket,
} from '../api/essence.types';

const CANCELLED_SENTINEL = '0001-01-01';

function digits(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function essenceCustomerPhone(
  telefones?: Array<string | null>,
  storeDdd?: string,
): string | undefined {
  const raw = telefones?.find((entry) => (entry ?? '').trim()) ?? '';
  const number = digits(raw);
  if (!number) return undefined;
  if (number.startsWith('55') && number.length >= 12) return number;
  const area = digits(storeDdd);
  if (area.length === 2 && number.length === 9) return `${area}${number}`;
  if (area.length === 2 && number.length === 8) return `${area}9${number}`;
  return number;
}

export function essenceCustomerName(nome?: string | null): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || 'Cliente';
}

export function essenceTicketIsCancelled(ticket: EssenceTicket): boolean {
  const cancelledAt = ticket.DataCancelado ?? '';
  if (cancelledAt && !cancelledAt.startsWith(CANCELLED_SENTINEL)) {
    return true;
  }
  return Boolean((ticket.MotivoCancelado ?? '').trim());
}

export function essenceExternalOrderId(
  storeGuid: string,
  sequencia: number,
): string {
  return `essence:${storeGuid}:${sequencia}`;
}

export function essenceStoreMerchantId(storeGuid: string): number {
  let hash = 0;
  for (let i = 0; i < storeGuid.length; i += 1) {
    hash = (hash * 31 + storeGuid.charCodeAt(i)) | 0;
  }
  return hash === 0 ? 1 : Math.abs(hash);
}

export function essenceIntegratorOrderId(
  storeGuid: string,
  sequencia: number,
): number {
  const key = `${storeGuid}-${sequencia}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return hash === 0 ? 1 : hash;
}

export function essenceTicketTotal(ticket: EssenceTicket): number {
  const total = ticket.PrecoFinal ?? ticket.PrecoBase ?? 0;
  return roundMoney(total);
}

export class EssenceSaleMapping {
  static toCustomerFromTicket(ticket: EssenceTicket) {
    return {
      name: essenceCustomerName(ticket.Cliente?.Nome),
    };
  }

  static toCustomerFromCatalog(
    customer: EssenceCliente,
    storeDdd?: string,
  ) {
    return {
      name: essenceCustomerName(customer.Nome),
      phone: essenceCustomerPhone(customer.Telefones, storeDdd),
    };
  }

  static toOrder(
    ticket: EssenceTicket,
    customerId: string | null,
    companyId: string,
    storeGuid: string,
  ): CreateOrderDto {
    const total = essenceTicketTotal(ticket);
    const discount = roundMoney(ticket.Desconto ?? 0);
    const quantity =
      ticket.Quantidade && ticket.Quantidade > 0 ? ticket.Quantidade : 1;
    const unitPrice = roundMoney(total / quantity);
    const items: CreateOrderItemDto[] = [
      {
        itemId: 0,
        externalCode: String(ticket.Sequencia),
        name: 'Serviços de lavanderia',
        quantity,
        unitPrice,
        totalPrice: total,
        kind: 'service',
        status: 'closed',
      },
    ];

    return {
      externalOrderId: essenceExternalOrderId(storeGuid, ticket.Sequencia),
      integratorOrderId: essenceIntegratorOrderId(storeGuid, ticket.Sequencia),
      displayId: ticket.Sequencia,
      merchantId: essenceStoreMerchantId(storeGuid),
      status: 'closed',
      orderType: 'takeout',
      orderTiming: 'immediate',
      salesChannel: 'HYBEX_ESSENCE',
      customerOrigin: 'hybex-essence',
      observation: [
        'Hybex Essence',
        `Loja: ${storeGuid}`,
        `Ticket: ${ticket.Sequencia}`,
        ticket.Cliente?.Codigo ? `Cliente: ${ticket.Cliente.Codigo}` : null,
        ticket.Status ? `Status: ${ticket.Status}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
      deliveryFee: 0,
      serviceFee: 0,
      additionalFee: 0,
      total,
      companyId,
      customerId,
      createdAt: new Date(ticket.DataCriacao),
      updatedAt: new Date(ticket.DataCriacao),
      items,
      payments: [
        {
          total,
          paymentType: 'unknown',
          status: 'paid',
          paymentMethod: 'unknown',
          paymentFee: 0,
        },
      ],
      discounts:
        discount > 0
          ? [
              {
                type: 'discount',
                value: discount,
                description: 'Desconto Hybex Essence',
              },
            ]
          : [],
    };
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}