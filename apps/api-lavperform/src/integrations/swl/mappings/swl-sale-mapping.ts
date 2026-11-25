import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { CreateOrderDiscountDto } from '../../../orders/application/dto/create-order-discount.dto';
import { CreateOrderItemDto } from '../../../orders/application/dto/create-order-item.dto';
import { CreateOrderPaymentDto } from '../../../orders/application/dto/create-order-payment.dto';
import { SwlAtendimento, SwlAtendimentoItem } from '../api/swl.types';

const MAX_INT32 = 2147483647;
const PAID = 'PAGO';
const ACTIVE = 'ATIVO';
const CANCEL_SITUATIONS = ['INATIVO', 'EXCLUIDO'];

export type SwlAttendanceAction = 'create' | 'update' | 'cancel' | 'skip';

export function swlHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  if (hash === 0 || hash === -2147483648) {
    return 1;
  }
  return hash < 0 ? -hash : hash;
}

export function swlExternalOrderId(swlId: number): string {
  return `swl:${swlId}`;
}

function inInt32Range(value: number | null | undefined): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_INT32
  );
}

export function swlIntegratorOrderId(swlId: number): number {
  return inInt32Range(swlId) ? swlId : swlHash(swlExternalOrderId(swlId));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function moneyOrNull(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? roundMoney(parsed) : null;
}

export function parseSwlMoney(value: string | null | undefined): number {
  return moneyOrNull(value) ?? 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function activePayments(atendimento: SwlAtendimento) {
  return (atendimento.pagamentos ?? []).filter(
    (payment) => payment.situacao === ACTIVE,
  );
}

export function swlOrderDate(atendimento: SwlAtendimento): Date {
  const opening = parseDate(atendimento.datas?.abertura);
  if (opening) {
    return opening;
  }

  let earliest: { date: Date; id: number } | null = null;
  for (const payment of activePayments(atendimento)) {
    const date = parseDate(payment.registradoEm);
    if (!date) {
      continue;
    }
    if (
      !earliest ||
      date.getTime() < earliest.date.getTime() ||
      (date.getTime() === earliest.date.getTime() && payment.id < earliest.id)
    ) {
      earliest = { date, id: payment.id };
    }
  }
  if (earliest) {
    return earliest.date;
  }

  return parseDate(atendimento.atualizadoEm) ?? new Date();
}

export function swlAttendanceAction(
  atendimento: SwlAtendimento,
  orderExists: boolean,
): SwlAttendanceAction {
  const situation = atendimento.situacao ?? '';
  if (CANCEL_SITUATIONS.includes(situation)) {
    return orderExists ? 'cancel' : 'skip';
  }
  if (situation === ACTIVE && atendimento.status?.pagamento === PAID) {
    return orderExists ? 'update' : 'create';
  }
  return orderExists ? 'update' : 'skip';
}

function isCancelled(atendimento: SwlAtendimento): boolean {
  return CANCEL_SITUATIONS.includes(atendimento.situacao ?? '');
}

function mapItem(item: SwlAtendimentoItem): CreateOrderItemDto {
  const total = moneyOrNull(item.valorTotal);
  const unit = moneyOrNull(item.valorUnitario);
  const rawQuantity = item.quantidade?.trim() ?? '';
  const parsedQuantity = rawQuantity === '' ? NaN : Number(rawQuantity);
  const isWholeQuantity =
    Number.isFinite(parsedQuantity) &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0;

  const base = {
    itemId: inInt32Range(item.itemId) ? item.itemId : 0,
    externalCode: String(item.id),
    name: item.descricao?.trim() || 'Serviço',
    kind: 'service',
    status: 'closed',
    items: [],
    options: [],
  };

  if (!isWholeQuantity) {
    const lineTotal = total ?? 0;
    const unitLabel = item.unidadeMedida?.trim();
    const original = rawQuantity === '' ? 'não informada' : rawQuantity;
    return {
      ...base,
      quantity: 1,
      unitPrice: lineTotal,
      totalPrice: lineTotal,
      observation: `Quantidade original: ${original}${unitLabel ? ` ${unitLabel}` : ''}`,
    };
  }

  const unitPrice =
    unit ?? (total !== null ? roundMoney(total / parsedQuantity) : 0);
  return {
    ...base,
    quantity: parsedQuantity,
    unitPrice,
    totalPrice: total ?? roundMoney(unitPrice * parsedQuantity),
  };
}

function mapDiscounts(atendimento: SwlAtendimento): CreateOrderDiscountDto[] {
  const valores = atendimento.valores;
  const discounts: CreateOrderDiscountDto[] = [];

  const amount = parseSwlMoney(valores?.descontoValor);
  if (amount > 0) {
    discounts.push({
      type: 'discount',
      value: amount,
      description: 'Desconto SWL',
    });
  }

  const voucher = parseSwlMoney(valores?.voucherFidelidade);
  if (voucher > 0) {
    discounts.push({
      type: 'voucher',
      value: voucher,
      description: 'Voucher fidelidade',
    });
  }

  const percent = moneyOrNull(valores?.descontoPercentual) ?? 0;
  if (percent > 0) {
    const value = roundMoney((parseSwlMoney(valores?.total) * percent) / 100);
    if (value > 0) {
      discounts.push({
        type: 'discount',
        value,
        description: 'Desconto percentual',
      });
    }
  }

  return discounts;
}

function paidPayment(
  label: string,
  total: number,
  paymentFee = 0,
): CreateOrderPaymentDto {
  return {
    total,
    paymentType: label,
    status: 'paid',
    paymentMethod: label,
    paymentFee,
  };
}

function mapPayments(atendimento: SwlAtendimento): CreateOrderPaymentDto[] {
  const payments: CreateOrderPaymentDto[] = [];

  for (const payment of activePayments(atendimento)) {
    const total = parseSwlMoney(payment.valor);
    if (total <= 0) {
      continue;
    }
    const afterFee = moneyOrNull(payment.valorAposTaxa);
    const fee = afterFee === null ? 0 : roundMoney(total - afterFee);
    payments.push(
      paidPayment(
        payment.forma?.trim() || 'Não informado',
        total,
        fee > 0 ? fee : 0,
      ),
    );
  }

  const credit = parseSwlMoney(atendimento.valores?.creditoUtilizado);
  if (credit > 0) {
    payments.push(paidPayment('Crédito SWL', credit));
  }

  if (payments.length === 0 && atendimento.status?.pagamento === PAID) {
    const paid = parseSwlMoney(atendimento.valores?.pago);
    const total = paid > 0 ? paid : parseSwlMoney(atendimento.valores?.liquido);
    if (total > 0) {
      payments.push(paidPayment('Fatura', total));
    }
  }

  return payments;
}

export function swlToOrder(
  atendimento: SwlAtendimento,
  customerId: string | null,
  companyId: string,
  centroNome: string,
): CreateOrderDto {
  const integratorOrderId = swlIntegratorOrderId(atendimento.id);
  const createdAt = swlOrderDate(atendimento);
  const cancelled = isCancelled(atendimento);
  const center = centroNome?.trim() || 'Centro de custo';
  const express = parseSwlMoney(atendimento.valores?.entregaExpressa);
  const observation =
    express > 0 ? `SWL | ${center} | ${express}` : `SWL | ${center}`;

  const order: CreateOrderDto = {
    externalOrderId: swlExternalOrderId(atendimento.id),
    integratorOrderId,
    displayId: integratorOrderId,
    merchantId: inInt32Range(atendimento.centroDeCustoId)
      ? atendimento.centroDeCustoId
      : 0,
    status: cancelled ? 'cancelled' : 'closed',
    orderType: 'takeout',
    orderTiming: 'immediate',
    salesChannel: 'SWL',
    customerOrigin: 'swl',
    observation,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total: parseSwlMoney(atendimento.valores?.liquido),
    companyId,
    customerId,
    createdAt,
    updatedAt: createdAt,
    items: (atendimento.itens ?? []).map(mapItem),
    payments: mapPayments(atendimento),
    discounts: mapDiscounts(atendimento),
  };

  if (cancelled) {
    order.cancellationReason = `SWL ${atendimento.situacao}`;
  }

  return order;
}
