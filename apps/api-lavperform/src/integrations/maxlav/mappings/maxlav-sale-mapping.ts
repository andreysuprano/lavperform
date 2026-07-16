import { MaxlavOrder, MaxlavMachineInfo } from '../api/maxlav.types';
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { parseUTCDate } from '../../../common/utils/date.utils';

/**
 * Converte uma string MongoDB ObjectId em um hash inteiro com sinal (32-bit)
 * para compatibilidade com o campo integratorOrderId (Int) do banco de dados.
 */
function objectIdToIntHash(id: string): number {
  const hex = id.replace(/-/g, '');
  let hash = 0;
  for (let i = 0; i < hex.length; i += 8) {
    const chunk = parseInt(hex.substring(i, i + 8), 16);
    hash = ((hash ^ chunk) | 0);
  }
  return hash;
}

function getMachineLabel(type: string): string {
  if (type === 'dryer') return 'Secagem';
  if (type === 'washer') return 'Lavagem';
  return 'Serviço';
}

function centsToReais(cents: number): number {
  return cents / 100;
}

function buildItems(order: MaxlavOrder) {
  if (order.machinesInfo?.length) {
    return order.machinesInfo.map((machine: MaxlavMachineInfo, idx: number) => ({
      itemId: idx,
      externalCode: machine._id ?? `${machine.machineCode}-${idx}`,
      name: `${getMachineLabel(machine.type)} - Máquina ${machine.machineCode}`,
      quantity: 1,
      unitPrice: centsToReais(machine.price),
      totalPrice: centsToReais(machine.price),
      kind: 'product' as const,
      status: 'closed' as const,
      observation: undefined,
      items: [],
      options: [],
    }));
  }

  return [
    {
      itemId: 0,
      externalCode: order.id,
      name: 'Serviço de Lavanderia',
      quantity: 1,
      unitPrice: centsToReais(order.amount),
      totalPrice: centsToReais(order.amount),
      kind: 'product' as const,
      status: 'closed' as const,
      observation: undefined,
      items: [],
      options: [],
    },
  ];
}

export class MaxlavSaleMapping {
  static toOrder(
    order: MaxlavOrder,
    customerId: string,
    companyId: string,
  ): CreateOrderDto {
    const saleDate = parseUTCDate(order.createdAt);
    const intHash = objectIdToIntHash(order.id);
    const paymentType = order.paymentType ?? 'unknown';

    return {
      integratorOrderId: intHash,
      displayId: intHash,
      merchantId: 0,
      status: 'closed',
      orderType: 'delivery',
      orderTiming: 'immediate',
      salesChannel: 'MAXLAV',
      customerOrigin: order.rechargeType ?? 'unknown',
      observation: `Maxlav | ID: ${order.id} | Tipo: ${order.rechargeType ?? '-'} | Recibo: ${order.paymentReceiptCode ?? '-'}`,
      deliveryFee: 0,
      serviceFee: 0,
      additionalFee: 0,
      total: centsToReais(order.amountPay ?? order.amount),
      companyId,
      customerId,
      createdAt: saleDate!,
      updatedAt: saleDate!,

      items: buildItems(order),

      payments: [
        {
          total: centsToReais(order.amountPay ?? order.amount),
          paymentType,
          status: 'paid',
          paymentMethod: order.cardBrand
            ? `${paymentType} - ${order.cardBrand}`
            : paymentType,
          paymentFee: 0,
        },
      ],

      discounts: [],
    };
  }

  static getIntegratorOrderId(orderId: string): number {
    return objectIdToIntHash(orderId);
  }
}
