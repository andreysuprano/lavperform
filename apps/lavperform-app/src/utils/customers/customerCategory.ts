import { clientTypesOptions } from '@/utils/constants/clientType'
import { LEAD_SEGMENT_KEY, LEAD_SEGMENT_LABEL } from '@/utils/constants/rfvMatrix'

const LABEL_BY_KEY: Record<string, string> = {
  ...Object.fromEntries(
    clientTypesOptions.items.map((item) => [item.value, item.label])
  ),
  [LEAD_SEGMENT_KEY]: LEAD_SEGMENT_LABEL,
}

export type CustomerCategorySource = {
  rfvClassification?: string | null
}

export function getCustomerCategoryKey(
  customer: CustomerCategorySource | null | undefined
): string {
  const classification = customer?.rfvClassification?.trim()
  if (classification) return classification
  return LEAD_SEGMENT_KEY
}

export function getCustomerCategoryLabel(
  customer: CustomerCategorySource | null | undefined
): string {
  const key = getCustomerCategoryKey(customer)
  return LABEL_BY_KEY[key] ?? key
}

export function isLeadCategory(key: string): boolean {
  return key === LEAD_SEGMENT_KEY
}
