import { clientTypesOptions } from '@/utils/constants/clientType'
import type {
  ComparisonOperator,
  Criterion,
  CriterionType,
  GroupOperator,
  RuleGroup,
} from '@/types'
import { isRuleGroup } from '@/types'

export const WIZARD_STEPS = [
  { title: 'Quem incluir', id: 'include' },
  { title: 'Quem deixar de fora', id: 'exclude' },
  { title: 'Nome e detalhes', id: 'details' },
  { title: 'Revisar', id: 'review' },
] as const

export const CRITERION_LABELS: Record<CriterionType, string> = {
  rfv_classification: 'Tipo de cliente',
  last_order_days: 'Há quanto tempo não compra',
  neighborhood: 'Bairro',
  city: 'Cidade',
  phone_ddd: 'DDD',
  purchased_product: 'Produto/Serviço que comprou',
  total_orders: 'Quantidade de compras',
  average_ticket: 'Quanto costuma gastar',
  whatsapp_verified: 'Tem WhatsApp confirmado',
  has_orders: 'Já fez venda',
  birthday_within_days: 'Faz aniversário em breve',
  top_customers_month: 'Top clientes do mês',
}

export const CRITERION_HELPERS: Partial<Record<CriterionType, string>> = {
  rfv_classification: 'Use os tipos que o sistema já calcula, como Campeão, Novo ou Hibernando.',
  last_order_days:
    'Pode usar só os dias, só as datas, ou os dois. Se preencher os dois, o cliente precisa atender os dois ao mesmo tempo.',
  neighborhood: 'Inclui clientes de um bairro específico.',
  city: 'Inclui clientes de uma cidade específica.',
  phone_ddd: 'Inclui clientes por um ou mais DDDs do telefone (código de área).',
  purchased_product: 'Filtra quem já comprou determinado produto.',
  total_orders: 'Filtra pela quantidade total de vendas feitas. Use as datas para limitar o período.',
  average_ticket: 'Filtra pelo valor médio que o cliente costuma gastar.',
  whatsapp_verified: 'Filtra quem tem ou não o WhatsApp confirmado.',
  has_orders: 'Filtra quem já comprou alguma vez ou ainda não.',
  birthday_within_days: 'Inclui quem faz aniversário nos próximos dias informados.',
  top_customers_month: 'Inclui os clientes com mais pedidos no mês atual.',
}

export const OPERATOR_LABELS: Partial<Record<ComparisonOperator, string>> = {
  eq: 'É igual a',
  gt: 'É maior que',
  gte: 'É pelo menos',
  lt: 'É menor que',
  lte: 'É no máximo',
  between: 'Está entre',
  in: 'É um destes',
  not_in: 'Não é nenhum destes',
  contains: 'Contém',
  ever: 'Já comprou alguma vez',
  within_days: 'Comprou nos últimos dias',
  not_within_days: 'Não comprou nos últimos dias',
}

export const GROUP_OPERATOR_OPTIONS: {
  value: GroupOperator
  label: string
  description: string
}[] = [
  {
    value: 'AND',
    label: 'Todos os filtros',
    description: 'Precisa atender a todos os filtros',
  },
  {
    value: 'OR',
    label: 'Qualquer filtro',
    description: 'Pode atender a qualquer filtro',
  },
]

const clientTypeLabelByValue = Object.fromEntries(
  clientTypesOptions.items.map((item) => [item.value, item.label]),
)

export function formatClientType(value: string) {
  return clientTypeLabelByValue[value] ?? value
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatCriterionSummary(criterion: Criterion): string {
  const label = CRITERION_LABELS[criterion.type]
  const operatorLabel = OPERATOR_LABELS[criterion.operator] ?? criterion.operator
  const summary = formatCriterionSummaryBase(criterion, label, operatorLabel)
  if (criterion.type === 'last_order_days') {
    return summary
  }

  const from = criterion.period?.from
  const to = criterion.period?.to
  if (!from && !to) {
    return summary
  }

  return `${summary} (vendas entre ${from || 'qualquer data'} e ${to || 'qualquer data'})`
}

function formatCriterionSummaryBase(
  criterion: Criterion,
  label: string,
  operatorLabel: string,
): string {
  switch (criterion.type) {
    case 'rfv_classification': {
      const values = Array.isArray(criterion.value)
        ? criterion.value.map((item) => formatClientType(String(item)))
        : []
      const list = values.length ? values.join(', ') : 'nenhum tipo'
      return criterion.operator === 'not_in'
        ? `${label}: não é ${list}`
        : `${label}: ${list}`
    }
    case 'last_order_days': {
      const range =
        typeof criterion.value === 'number'
          ? { days: criterion.value }
          : criterion.value && typeof criterion.value === 'object' && !Array.isArray(criterion.value)
            ? (criterion.value as { from?: string; to?: string; min?: number; max?: number; days?: number })
            : {}
      const parts: string[] = []

      if (criterion.operator === 'between') {
        if (range.from || range.to) {
          parts.push(`entre ${range.from || 'qualquer data'} e ${range.to || 'qualquer data'}`)
        } else if (range.min != null || range.max != null) {
          parts.push(
            `entre ${range.min != null ? range.min : 'qualquer'} e ${range.max != null ? range.max : 'qualquer'} dias`,
          )
        }
      } else if (range.days != null) {
        parts.push(`${operatorLabel.toLowerCase()} ${range.days} dias`)
      }

      if (criterion.operator !== 'between' && (range.from || range.to)) {
        parts.push(`entre ${range.from || 'qualquer data'} e ${range.to || 'qualquer data'}`)
      }

      if (!parts.length) {
        return `${label}: sem limite de data`
      }

      return `${label}: ${parts.join(' e ')}`
    }
    case 'total_orders':
      return `${label}: ${operatorLabel.toLowerCase()} ${Number(criterion.value ?? 0)}`
    case 'average_ticket':
      return `${label}: ${operatorLabel.toLowerCase()} ${formatMoney(Number(criterion.value ?? 0))}`
    case 'neighborhood':
    case 'city': {
      const value = String(criterion.value ?? '').trim() || 'não informado'
      return `${label}: ${operatorLabel.toLowerCase()} ${value}`
    }
    case 'phone_ddd': {
      const values = Array.isArray(criterion.value)
        ? criterion.value.map((item) => String(item))
        : []
      const list = values.length ? values.join(', ') : 'nenhum DDD'
      return criterion.operator === 'not_in'
        ? `${label}: não é ${list}`
        : `${label}: ${list}`
    }
    case 'purchased_product': {
      const productValue =
        typeof criterion.value === 'object' && criterion.value
          ? (criterion.value as { productName?: string; days?: number })
          : { productName: '', days: 30 }
      const productName = productValue.productName?.trim() || 'produto não informado'
      if (criterion.operator === 'ever') {
        return `Já comprou ${productName}`
      }
      if (criterion.operator === 'within_days') {
        return `Comprou ${productName} nos últimos ${productValue.days ?? 30} dias`
      }
      return `Não comprou ${productName} nos últimos ${productValue.days ?? 30} dias`
    }
    case 'whatsapp_verified':
      return Boolean(criterion.value)
        ? 'Tem WhatsApp confirmado'
        : 'Não tem WhatsApp confirmado'
    case 'has_orders':
      return Boolean(criterion.value) ? 'Já fez venda' : 'Ainda não fez venda'
    case 'birthday_within_days':
      return `Faz aniversário nos próximos ${Number(criterion.value ?? 0)} dias`
    case 'top_customers_month':
      return `Está entre os ${Number(criterion.value ?? 0)} com mais pedidos no mês`
    default:
      return label
  }
}

function summarizeRuleGroup(group: RuleGroup): string {
  const parts = group.rules.map((rule) =>
    isRuleGroup(rule) ? `(${summarizeRuleGroup(rule)})` : formatCriterionSummary(rule),
  )

  if (!parts.length) {
    return 'nenhum filtro'
  }

  const joiner = group.operator === 'AND' ? ' e ' : ' ou '
  return parts.join(joiner)
}

export function summarizeAudienceDefinition(definition: {
  include: RuleGroup
  exclude?: RuleGroup
}): { includeSummary: string; excludeSummary?: string } {
  return {
    includeSummary: summarizeRuleGroup(definition.include),
    excludeSummary: definition.exclude
      ? summarizeRuleGroup(definition.exclude)
      : undefined,
  }
}

export function hasIncludeRules(group: RuleGroup): boolean {
  return group.rules.length > 0
}
