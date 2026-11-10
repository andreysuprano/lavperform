import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import {
  WaymoneyPackagePurchase,
  WaymoneyPayment,
  waymoneyPaymentLabel,
} from '../api/waymoney.types';

export function waymoneyHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  if (hash === 0 || hash === -2147483648) {
    return 1;
  }
  return hash < 0 ? -hash : hash;
}

export function waymoneyIntegratorOrderId(
  kind: 'payment' | 'package',
  id: string,
): number {
  return waymoneyHash(`${kind}:${id}`);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function branchName(branch?: { name?: string | null } | null): string {
  const name = branch?.name?.trim();
  return name || 'Filial';
}

function machineItemName(payment: WaymoneyPayment): string {
  const named = payment.machine?.name?.trim() || payment.machineName?.trim();
  if (named) {
    return named;
  }
  const type = payment.machine?.type ?? payment.machineType;
  if (type === 'WASHER') {
    return 'Lavadora';
  }
  if (type === 'DRYER') {
    return 'Secadora';
  }
  return 'Máquina';
}

function paidPayment(total: number, method: unknown) {
  const label = waymoneyPaymentLabel(method);
  return {
    total,
    paymentType: label,
    status: 'paid',
    paymentMethod: label,
    paymentFee: 0,
  };
}

export function waymoneyCycleToOrder(
  payment: WaymoneyPayment,
  customerId: string | null,
  companyId: string,
): CreateOrderDto {
  const integratorOrderId = waymoneyIntegratorOrderId('payment', payment.id);
  const total = payment.finalTotal ?? 0;
  const createdAt = new Date(payment.createdAt ?? Date.now());
  const discount = roundMoney(payment.discount ?? 0);
  const machine = machineItemName(payment);

  return {
    integratorOrderId,
    displayId: integratorOrderId,
    merchantId: 0,
    status: 'closed',
    orderType: 'takeout',
    orderTiming: 'immediate',
    salesChannel: 'WAYMONEY',
    customerOrigin: 'waymoney',
    observation: `WayMoney | ${branchName(payment.branch)} | ${machine}`,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    companyId,
    customerId,
    createdAt,
    updatedAt: createdAt,
    items: [
      {
        itemId: 0,
        name: machine,
        quantity: 1,
        unitPrice: total,
        totalPrice: total,
        kind: 'service',
        status: 'closed',
        items: [],
        options: [],
      },
    ],
    payments: [paidPayment(total, payment.paymentMethod)],
    discounts:
      discount > 0
        ? [{ type: 'discount', value: discount, description: 'Desconto WayMoney' }]
        : [],
  };
}

export function waymoneyPackageToOrder(
  purchase: WaymoneyPackagePurchase,
  customerId: string | null,
  companyId: string,
): CreateOrderDto {
  const integratorOrderId = waymoneyIntegratorOrderId('package', purchase.id);
  const total = purchase.amount ?? 0;
  const createdAt = new Date(purchase.createdAt ?? Date.now());
  const name = purchase.packageName?.trim() || 'Compra de pacote';

  return {
    integratorOrderId,
    displayId: integratorOrderId,
    merchantId: 0,
    status: 'closed',
    orderType: 'takeout',
    orderTiming: 'immediate',
    salesChannel: 'WAYMONEY',
    customerOrigin: 'waymoney',
    observation: `WayMoney | ${branchName(purchase.branch)} | Pacote`,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    companyId,
    customerId,
    createdAt,
    updatedAt: createdAt,
    items: [
      {
        itemId: 0,
        name,
        quantity: 1,
        unitPrice: total,
        totalPrice: total,
        kind: 'product',
        status: 'closed',
        items: [],
        options: [],
      },
    ],
    payments: [paidPayment(total, purchase.paymentMethod)],
    discounts: [],
  };
}
