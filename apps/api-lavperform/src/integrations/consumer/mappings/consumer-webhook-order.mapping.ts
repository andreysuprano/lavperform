import { parseUTCDate } from 'src/common/utils/date.utils';
import { CreateOrderDto } from 'src/orders/application/dto/create-order.dto';
import { CreateOrderItemDto } from 'src/orders/application/dto/create-order-item.dto';
import { CreateOrderDiscountDto } from 'src/orders/application/dto/create-order-discount.dto';
import type {
  ConsumerWebhookItem,
  ConsumerWebhookPayload,
} from '../dto/consumer-webhook-payload.interface';
import { resolveConsumerPhysicalAddress } from '../utils/consumer-webhook-address.resolve';

function parseConsumerDate(value: string | null | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().replace(' ', 'T');
  return parseUTCDate(normalized);
}

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value: string | null | undefined, fallback = 0): number {
  const n = Math.trunc(toNumber(value, NaN));
  return Number.isFinite(n) ? n : fallback;
}

function toItemId(codigo: string | undefined): number {
  const n = Number.parseInt(String(codigo ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapItemRow(row: ConsumerWebhookItem): CreateOrderItemDto {
  const qty = Math.max(1, Math.round(toNumber(row.quantidade, 1)));
  return {
    itemId: toItemId(row.codigo),
    externalCode:
      row.codigoprodutodetalhe ??
      row.codigoproduto ??
      row.produto?.codigo ??
      undefined,
    name: (row.nomeproduto ?? row.produto?.nome ?? 'Item').trim() || 'Item',
    quantity: qty,
    unitPrice: toNumber(row.valorunitario, 0),
    totalPrice: toNumber(row.valortotal, 0),
    kind: 'item',
    status: 'confirmed',
    observation: row.detalhes?.trim() || undefined,
    items: [],
    options: [],
  };
}

function buildItemTree(rows: ConsumerWebhookItem[]): CreateOrderItemDto[] {
  const list = rows ?? [];
  const byParent = new Map<string | null, ConsumerWebhookItem[]>();
  for (const row of list) {
    const p = row.codigopai?.trim() ? row.codigopai.trim() : null;
    const arr = byParent.get(p) ?? [];
    arr.push(row);
    byParent.set(p, arr);
  }
  const roots = byParent.get(null) ?? [];

  const mapWithChildren = (row: ConsumerWebhookItem): CreateOrderItemDto => {
    const key = row.codigo?.trim() ?? '';
    const children = key ? byParent.get(key) ?? [] : [];
    const base = mapItemRow(row);
    if (children.length > 0) {
      base.items = children.map(mapWithChildren);
    }
    return base;
  };

  return roots.map(mapWithChildren);
}

function buildDiscounts(pedido: ConsumerWebhookPayload['pedido']): CreateOrderDiscountDto[] {
  const totalDesc = toNumber(pedido?.totaldesconto, 0);
  if (totalDesc <= 0) return [];
  return [
    {
      type: 'order_discount',
      value: totalDesc,
      description: 'Desconto (Consumer)',
    },
  ];
}

export class ConsumerWebhookOrderMapping {
  static toOrder(
    payload: ConsumerWebhookPayload,
    customerId: string,
    companyId: string,
  ): CreateOrderDto | null {
    const pedido = payload.pedido;
    if (!pedido?.codigo) return null;

    const integratorOrderId = Number.parseInt(String(pedido.codigo), 10);
    if (!Number.isFinite(integratorOrderId)) return null;

    const createdAt =
      parseConsumerDate(pedido.dataabertura) ??
      parseConsumerDate(pedido.datafechamento) ??
      new Date();
    const updatedAt = parseConsumerDate(pedido.datafechamento) ?? createdAt;

    const delivery = payload.delivery;
    const tipo = (payload.tipo ?? 'delivery').toLowerCase();

    const resolved = resolveConsumerPhysicalAddress(payload);
    const deliveryAddress = resolved
      ? {
          street: resolved.street,
          number: resolved.number,
          complement: resolved.complement,
          neighborhood: resolved.neighborhood,
          city: resolved.city,
          state: resolved.state,
          zipCode: resolved.zipCode,
          reference: resolved.reference,
        }
      : undefined;

    return {
      integratorOrderId,
      displayId: toInt(pedido.numero, 0),
      merchantId: 0,
      status: 'closed',
      orderType: tipo,
      orderTiming: 'immediate',
      salesChannel: 'consumer',
      customerOrigin: 'consumer_webhook',
      observation: delivery?.observacao?.trim() || undefined,
      deliveryFee: toNumber(delivery?.frete, 0),
      serviceFee: toNumber(pedido.totalservico, 0),
      additionalFee: toNumber(pedido.totalacrescimo, 0),
      total: toNumber(delivery?.total ?? pedido.valortotal, 0),
      companyId,
      customerId,
      createdAt,
      updatedAt,
      deliveryAddress,
      items: buildItemTree(payload.itens ?? []),
      discounts: buildDiscounts(pedido),
      payments: [],
    };
  }
}
