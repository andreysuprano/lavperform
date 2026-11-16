import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import {
  WindelPerson,
  WindelServiceOrderDetail,
} from '../api/windel.types';

const INT32_MAX = 2147483647;

export function windelSafeInt(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > INT32_MAX) {
    return undefined;
  }
  return numeric;
}

export function windelHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  if (hash === 0 || hash === -2147483648) {
    return 1;
  }
  return hash < 0 ? -hash : hash;
}

export function windelIntegratorOrderId(id: number | string): number {
  return windelSafeInt(id) ?? windelHash(String(id));
}

export function windelDisplayId(
  numero: number | string | null | undefined,
  integratorOrderId: number,
): number {
  return windelSafeInt(numero) ?? integratorOrderId;
}

export function windelMerchantId(empresaId: number | null | undefined): number {
  return windelSafeInt(empresaId) ?? 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function windelSaleToOrder(
  order: WindelServiceOrderDetail,
  _person: WindelPerson | null,
  customerId: string | null,
  companyId: string,
): CreateOrderDto {
  const integratorOrderId = windelIntegratorOrderId(order.id);
  const displayId = windelDisplayId(order.numero, integratorOrderId);
  const lines = order.movDocs ?? [];
  const items =
    lines.length > 0
      ? lines.map((line) => ({
          itemId: 0,
          name: line.xProd?.trim() || 'Item',
          quantity: line.quantidade ?? 0,
          unitPrice: line.valorUnitario ?? 0,
          totalPrice: line.valorTotal ?? 0,
          kind: line.servico ? 'service' : 'product',
          status: 'closed',
          items: [],
          options: [],
        }))
      : [
          {
            itemId: 0,
            name: 'Ordem de serviço',
            quantity: 1,
            unitPrice: order.valorTotal ?? 0,
            totalPrice: order.valorTotal ?? 0,
            kind: 'product',
            status: 'closed',
            items: [],
            options: [],
          },
        ];
  const payments =
    (order.formaDePagamentoDocs ?? []).length > 0
      ? (order.formaDePagamentoDocs ?? []).map((payment) => {
          const method = payment.formaDePagamento?.nome?.trim() || 'unknown';
          return {
            total: payment.valor ?? 0,
            paymentType: method,
            status: 'paid',
            paymentMethod: method,
            paymentFee: 0,
          };
        })
      : [
          {
            total: order.valorTotal ?? 0,
            paymentType: 'unknown',
            status: 'paid',
            paymentMethod: 'unknown',
            paymentFee: 0,
          },
        ];
  const discount = roundMoney(order.valorDesconto ?? 0);
  const createdAt = new Date(order.createdAt);

  return {
    integratorOrderId,
    displayId,
    merchantId: windelMerchantId(order.empresaId),
    status: 'closed',
    orderType: 'takeout',
    orderTiming: 'immediate',
    salesChannel: 'WINDEL',
    customerOrigin: 'windel',
    observation: `Windel | Série: ${order.serie ?? ''} | Número: ${order.numero}`,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total: order.valorTotal ?? 0,
    companyId,
    customerId,
    createdAt,
    updatedAt: createdAt,
    items,
    payments,
    discounts:
      discount > 0
        ? [{ type: 'discount', value: discount, description: 'Desconto Windel' }]
        : [],
  };
}
