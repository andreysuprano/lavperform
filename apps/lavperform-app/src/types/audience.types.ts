export type AudienceTargetingMode = 'RFV' | 'AUDIENCE'

export type GroupOperator = 'AND' | 'OR'

export type ComparisonOperator =
  | 'eq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'ever'
  | 'within_days'
  | 'not_within_days'

export type CriterionType =
  | 'rfv_classification'
  | 'last_order_days'
  | 'neighborhood'
  | 'city'
  | 'purchased_product'
  | 'total_orders'
  | 'average_ticket'
  | 'whatsapp_verified'
  | 'has_orders'
  | 'birthday_within_days'
  | 'top_customers_month'

export interface Criterion {
  type: CriterionType
  operator: ComparisonOperator
  value: unknown
}

export interface RuleGroup {
  operator: GroupOperator
  rules: Array<Criterion | RuleGroup>
}

export interface AudienceDefinition {
  version: 1
  include: RuleGroup
  exclude?: RuleGroup
}

export interface Audience {
  id: string
  companyId: string
  name: string
  description?: string | null
  definition: AudienceDefinition
  customerCount?: number
  createdAt: string
  updatedAt: string
}

export interface AudiencePreviewCustomer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  rfvClassification?: string | null
  address?: {
    neighborhood?: string | null
    city?: string | null
  } | null
}

export interface AudiencePreviewResponse {
  count: number
  sample: AudiencePreviewCustomer[]
}

export interface AudienceCriteriaMetadata {
  type: CriterionType
  label: string
  operators: ComparisonOperator[]
  valueType: string
}

export interface CreateAudienceRequest {
  name: string
  description?: string
  definition: AudienceDefinition
}

export interface UpdateAudienceRequest {
  name?: string
  description?: string
  definition?: AudienceDefinition
}

export interface AudiencesListResponse {
  data: Audience[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function isRuleGroup(rule: Criterion | RuleGroup): rule is RuleGroup {
  return 'operator' in rule && 'rules' in rule && !('type' in rule)
}

export function createEmptyCriterion(type: CriterionType = 'last_order_days'): Criterion {
  switch (type) {
    case 'rfv_classification':
      return { type, operator: 'in', value: ['campeao'] }
    case 'purchased_product':
      return { type, operator: 'ever', value: { productName: '' } }
    case 'whatsapp_verified':
    case 'has_orders':
      return { type, operator: 'eq', value: true }
    case 'birthday_within_days':
      return { type, operator: 'within_days', value: 30 }
    case 'top_customers_month':
      return { type, operator: 'eq', value: 10 }
    case 'neighborhood':
    case 'city':
      return { type, operator: 'eq', value: '' }
    default:
      return { type, operator: 'gte', value: 30 }
  }
}

export function createEmptyRuleGroup(): RuleGroup {
  return {
    operator: 'AND',
    rules: [createEmptyCriterion()],
  }
}

export function createEmptyDefinition(): AudienceDefinition {
  return {
    version: 1,
    include: createEmptyRuleGroup(),
  }
}
