import type { SislavSale } from '../clients/sislav.client'
import { digitsOnly, toIsoString } from '../util/dates'
import type { IngestOrderDto, IngestOrderItem } from './ingest-order.types'

const CYCLE_LABELS: Record<string, string> = {
  Lavadora: 'Lavagem',
  Secadora: 'Secagem',
}

const PAYMENT_TYPE_MAP: Record<number, string> = {
  1: 'cash',
  2: 'pix',
  3: 'credit_card',
  4: 'debit_card',
  5: 'voucher',
}

function toStableInt(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 0x7fffffff
}

/**
 * Converte data SisLav no formato "DD/MM/YYYY HH:mm" para ISO,
 * interpretando o horário como America/Sao_Paulo (UTC-3).
 */
export function parseSislavDate(value?: string | null): string {
  if (!value?.trim()) return toIsoString(null)

  const match = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)

  if (!match) return toIsoString(value)

  const [, dd, mm, yyyy, hh = '00', min = '00', sec = '00'] = match
  return toIsoString(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}-03:00`)
}

function mapStatus(status: string): IngestOrderDto['status'] {
  const normalized = status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  if (normalized.includes('cancel')) return 'cancelled'
  if (normalized.includes('pend')) return 'pending'
  return 'closed'
}

function mapPaymentType(payment: number): string {
  return PAYMENT_TYPE_MAP[payment] ?? `sislav_payment_${payment}`
}

function buildItems(sale: SislavSale): IngestOrderItem[] {
  const cycleLabel = CYCLE_LABELS[sale.cycle] ?? sale.cycle ?? 'Serviço'
  const machines = sale.machines?.length ? sale.machines : [null]
  const unitPrice =
    sale.totalAmount / Math.max(1, sale.machines?.length ?? 1)

  return machines.map((machine, idx) => ({
    itemId: idx,
    externalCode:
      machine !== null
        ? `${sale.id}-${sale.cycle}-${machine}`
        : `${sale.id}-${sale.cycle ?? 'service'}-${idx}`,
    name:
      machine !== null
        ? `${cycleLabel} - Máquina ${machine}`
        : cycleLabel || 'Serviço de Lavanderia',
    quantity: 1,
    unitPrice,
    totalPrice: unitPrice,
    kind: 'service',
    status: mapStatus(sale.status) === 'cancelled' ? 'cancelled' : 'closed',
  }))
}

export function isSislavSaleEligible(sale: SislavSale): boolean {
  if (!sale?.id) return false
  if (sale.type && sale.type.toUpperCase() !== 'SALE') return false
  return true
}

export function mapSislavSaleToIngestDto(sale: SislavSale): IngestOrderDto {
  const createdAt = parseSislavDate(sale.date)
  const total = Number(sale.totalAmount ?? sale.paidAmount ?? 0)
  const paymentType = mapPaymentType(sale.payment)
  const status = mapStatus(sale.status ?? 'Concluído')
  const phone = digitsOnly(sale.customer?.phone)
  const cpf = digitsOnly(sale.customer?.cpf)

  return {
    externalOrderId: sale.id,
    displayId: toStableInt(sale.id),
    status,
    orderType: 'pickup',
    orderTiming: 'instant',
    salesChannel: 'SISLAV',
    customerOrigin: sale.isSislavPay ? 'sislav_pay' : 'sislav',
    merchantId: 0,
    observation: `SisLav | ID: ${sale.id} | Ciclo: ${
      sale.cycle ?? '-'
    } | Lavanderia: ${sale.laundry?.trim() ?? '-'} | Visita: ${
      sale.visit ?? '-'
    } | Pagamento #: ${sale.payment_number ?? '-'}`,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    customer: {
      name: sale.customer?.name?.trim() || 'Cliente SisLav',
      phone,
      cpf,
      email: sale.customer?.email?.trim() || undefined,
    },
    items: buildItems(sale),
    payments: [
      {
        total: Number(sale.paidAmount ?? total),
        paymentType,
        status: status === 'cancelled' ? 'refunded' : 'paid',
        paymentMethod: sale.isSislavPay
          ? `${paymentType} (SisLav Pay)`
          : paymentType,
        paymentFee: 0,
      },
    ],
    discounts: undefined,
    createdAt,
    updatedAt: createdAt,
  }
}
