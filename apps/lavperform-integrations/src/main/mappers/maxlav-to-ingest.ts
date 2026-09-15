import type { MaxlavMachineInfo, MaxlavOrder } from '../clients/maxlav.client'
import { digitsOnly, toIsoString } from '../util/dates'
import type { IngestOrderDto, IngestOrderItem } from './ingest-order.types'

/**
 * Converte uma string MongoDB ObjectId em um hash inteiro com sinal (32-bit)
 * para uso como displayId numérico.
 */
function objectIdToIntHash(id: string): number {
  const hex = id.replace(/-/g, '')
  let hash = 0
  for (let i = 0; i < hex.length; i += 8) {
    const chunk = parseInt(hex.substring(i, i + 8), 16)
    hash = (hash ^ chunk) | 0
  }
  return Math.abs(hash) % 0x7fffffff
}

function getMachineLabel(type: string): string {
  if (type === 'dryer') return 'Secagem'
  if (type === 'washer') return 'Lavagem'
  return 'Serviço'
}

function centsToReais(cents: number): number {
  return cents / 100
}

function buildItems(order: MaxlavOrder): IngestOrderItem[] {
  if (order.machinesInfo?.length) {
    return order.machinesInfo.map((machine: MaxlavMachineInfo, idx: number) => ({
      itemId: idx,
      externalCode: machine._id ?? `${machine.machineCode}-${idx}`,
      name: `${getMachineLabel(machine.type)} - Máquina ${machine.machineCode}`,
      quantity: 1,
      unitPrice: centsToReais(machine.price),
      totalPrice: centsToReais(machine.price),
      kind: 'service',
      status: 'closed',
    }))
  }

  return [
    {
      itemId: 0,
      externalCode: order.id,
      name: 'Serviço de Lavanderia',
      quantity: 1,
      unitPrice: centsToReais(order.amount),
      totalPrice: centsToReais(order.amount),
      kind: 'service',
      status: 'closed',
    },
  ]
}

export function mapMaxlavOrderToIngestDto(order: MaxlavOrder): IngestOrderDto {
  const createdAt = toIsoString(order.createdAt)
  const updatedAt = toIsoString(order.updatedAt ?? order.createdAt)
  const paymentType = order.paymentType ?? 'unknown'
  const total = centsToReais(order.amountPay ?? order.amount)

  return {
    externalOrderId: order.id,
    displayId: objectIdToIntHash(order.id),
    status: 'closed',
    orderType: 'pickup',
    orderTiming: 'instant',
    salesChannel: 'MAXLAV',
    customerOrigin: order.rechargeType ?? 'maxlav',
    merchantId: 0,
    observation: `Maxlav | ID: ${order.id} | Tipo: ${
      order.rechargeType ?? '-'
    } | Recibo: ${order.paymentReceiptCode ?? '-'}`,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    customer: {
      name: order.customer?.fullName?.trim() || 'Cliente MaxLav',
      phone: digitsOnly(order.customer?.cellphone),
      cpf: digitsOnly(order.customer?.documentId),
      email: order.customer?.email?.trim() || undefined,
    },
    items: buildItems(order),
    payments: [
      {
        total,
        paymentType,
        status: 'paid',
        paymentMethod: order.cardBrand
          ? `${paymentType} - ${order.cardBrand}`
          : paymentType,
        paymentFee: 0,
      },
    ],
    discounts: undefined,
    createdAt,
    updatedAt,
  }
}
