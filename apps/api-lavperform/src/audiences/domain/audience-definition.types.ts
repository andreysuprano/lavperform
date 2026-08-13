export type GroupOperator = 'AND' | 'OR';

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
  | 'not_within_days';

export type CriterionType =
  | 'rfv_classification'
  | 'last_order_days'
  | 'neighborhood'
  | 'city'
  | 'phone_ddd'
  | 'purchased_product'
  | 'total_orders'
  | 'average_ticket'
  | 'whatsapp_verified'
  | 'has_orders'
  | 'birthday_within_days'
  | 'top_customers_month';

export interface Criterion {
  type: CriterionType;
  operator: ComparisonOperator;
  value: unknown;
}

export interface RuleGroup {
  operator: GroupOperator;
  rules: Array<Criterion | RuleGroup>;
}

export interface AudienceDefinition {
  version: 1;
  include: RuleGroup;
  exclude?: RuleGroup;
}

export function isRuleGroup(rule: Criterion | RuleGroup): rule is RuleGroup {
  return 'operator' in rule && 'rules' in rule && !('type' in rule);
}

const VALID_CRITERION_TYPES: CriterionType[] = [
  'rfv_classification',
  'last_order_days',
  'neighborhood',
  'city',
  'phone_ddd',
  'purchased_product',
  'total_orders',
  'average_ticket',
  'whatsapp_verified',
  'has_orders',
  'birthday_within_days',
  'top_customers_month',
];

const VALID_OPERATORS_BY_TYPE: Record<CriterionType, ComparisonOperator[]> = {
  rfv_classification: ['in', 'not_in'],
  last_order_days: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  neighborhood: ['eq', 'in', 'contains'],
  city: ['eq', 'in', 'contains'],
  phone_ddd: ['in', 'not_in'],
  purchased_product: ['ever', 'within_days', 'not_within_days'],
  total_orders: ['eq', 'gt', 'gte', 'lt', 'lte'],
  average_ticket: ['gt', 'gte', 'lt', 'lte'],
  whatsapp_verified: ['eq'],
  has_orders: ['eq'],
  birthday_within_days: ['within_days'],
  top_customers_month: ['eq'],
};

export function validateAudienceDefinition(definition: unknown): AudienceDefinition {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Definição de audiência inválida');
  }

  const def = definition as Partial<AudienceDefinition>;

  if (def.version !== 1) {
    throw new Error('Versão da definição de audiência não suportada');
  }

  if (!def.include) {
    throw new Error('Bloco include é obrigatório');
  }

  validateRuleGroup(def.include, 'include');

  if (def.exclude) {
    validateRuleGroup(def.exclude, 'exclude');
  }

  return def as AudienceDefinition;
}

function validateRuleGroup(group: RuleGroup, path: string): void {
  if (!group || typeof group !== 'object') {
    throw new Error(`Grupo ${path} inválido`);
  }

  if (group.operator !== 'AND' && group.operator !== 'OR') {
    throw new Error(`Operador do grupo ${path} deve ser AND ou OR`);
  }

  if (!Array.isArray(group.rules) || group.rules.length === 0) {
    throw new Error(`Grupo ${path} deve ter ao menos uma regra`);
  }

  group.rules.forEach((rule, index) => {
    const rulePath = `${path}.rules[${index}]`;
    if (isRuleGroup(rule)) {
      validateRuleGroup(rule, rulePath);
      return;
    }
    validateCriterion(rule, rulePath);
  });
}

function validateCriterion(criterion: Criterion, path: string): void {
  if (!criterion?.type || !VALID_CRITERION_TYPES.includes(criterion.type)) {
    throw new Error(`Critério ${path} possui type inválido`);
  }

  const allowedOperators = VALID_OPERATORS_BY_TYPE[criterion.type];
  if (!criterion.operator || !allowedOperators.includes(criterion.operator)) {
    throw new Error(`Operador inválido para critério ${criterion.type} em ${path}`);
  }

  if (criterion.value === undefined || criterion.value === null) {
    throw new Error(`Valor obrigatório para critério em ${path}`);
  }
}

export const CRITERIA_METADATA = [
  {
    type: 'rfv_classification' as const,
    label: 'Segmentação RFV',
    operators: ['in', 'not_in'],
    valueType: 'rfv_list',
  },
  {
    type: 'last_order_days' as const,
    label: 'Dias desde o último pedido',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    valueType: 'number',
  },
  {
    type: 'neighborhood' as const,
    label: 'Bairro',
    operators: ['eq', 'in', 'contains'],
    valueType: 'string',
  },
  {
    type: 'city' as const,
    label: 'Cidade',
    operators: ['eq', 'in', 'contains'],
    valueType: 'string',
  },
  {
    type: 'phone_ddd' as const,
    label: 'DDD',
    operators: ['in', 'not_in'],
    valueType: 'ddd_list',
  },
  {
    type: 'purchased_product' as const,
    label: 'Comprou produto',
    operators: ['ever', 'within_days', 'not_within_days'],
    valueType: 'product',
  },
  {
    type: 'total_orders' as const,
    label: 'Total de pedidos',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte'],
    valueType: 'number',
  },
  {
    type: 'average_ticket' as const,
    label: 'Ticket médio',
    operators: ['gt', 'gte', 'lt', 'lte'],
    valueType: 'number',
  },
  {
    type: 'whatsapp_verified' as const,
    label: 'WhatsApp verificado',
    operators: ['eq'],
    valueType: 'boolean',
  },
  {
    type: 'has_orders' as const,
    label: 'Possui pedidos',
    operators: ['eq'],
    valueType: 'boolean',
  },
  {
    type: 'birthday_within_days' as const,
    label: 'Aniversário nos próximos dias',
    operators: ['within_days'],
    valueType: 'number',
  },
  {
    type: 'top_customers_month' as const,
    label: 'Top clientes do mês',
    operators: ['eq'],
    valueType: 'number',
  },
];
