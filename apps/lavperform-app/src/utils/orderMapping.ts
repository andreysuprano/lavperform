/**
 * Mapeia orderType e salesChannel para nome legível, conforme o tema ativo.
 */
import { getBusinessCopy } from '@/config'

export function getOrderOrigin(
  orderType?: string,
  salesChannel?: string
): string {
  if (!orderType && !salesChannel) {
    return ' '
  }

  const copy = getBusinessCopy()

  if (salesChannel) {
    return copy.salesChannelLabels[salesChannel] || salesChannel
  }

  if (orderType) {
    return copy.orderTypeLabels[orderType] || orderType
  }

  return ' '
}
