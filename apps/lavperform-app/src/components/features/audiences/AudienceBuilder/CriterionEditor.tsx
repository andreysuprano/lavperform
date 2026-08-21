import {
  Box,
  Button,
  createListCollection,
  Field,
  HStack,
  Input,
  NativeSelect,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react'
import { type ReactNode, useMemo } from 'react'

import { clientTypesOptions } from '@/utils/constants/clientType'
import type {
  ComparisonOperator,
  Criterion,
  CriterionType,
} from '@/types'

import {
  CRITERION_HELPERS,
  CRITERION_LABELS,
  OPERATOR_LABELS,
} from './audienceCopy'

type LastOrderFilterValue = {
  days?: number
  from: string
  to: string
}

function getLastOrderFilterValue(value: unknown): LastOrderFilterValue {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { days: value, from: '', to: '' }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { from: '', to: '' }
  }

  const range = value as { days?: unknown; from?: unknown; to?: unknown }
  const days = Number(range.days)
  return {
    days: Number.isFinite(days) ? days : undefined,
    from: typeof range.from === 'string' ? range.from : '',
    to: typeof range.to === 'string' ? range.to : '',
  }
}

function serializeLastOrderFilterValue(next: LastOrderFilterValue): Record<string, unknown> {
  return {
    ...(next.days != null && Number.isFinite(next.days) ? { days: next.days } : {}),
    ...(next.from ? { from: next.from } : {}),
    ...(next.to ? { to: next.to } : {}),
  }
}

type Props = {
  criterion: Criterion
  onChange: (criterion: Criterion) => void
  productOptions?: string[]
  neighborhoodOptions?: string[]
  cityOptions?: string[]
  dddOptions?: string[]
}

export function CriterionEditor({
  criterion,
  onChange,
  productOptions = [],
  neighborhoodOptions = [],
  cityOptions = [],
  dddOptions = [],
}: Props) {
  const operators = useMemo(() => {
    switch (criterion.type) {
      case 'rfv_classification':
      case 'phone_ddd':
        return ['in', 'not_in'] as ComparisonOperator[]
      case 'last_order_days':
        return ['eq', 'gt', 'gte', 'lt', 'lte', 'between'] as ComparisonOperator[]
      case 'neighborhood':
      case 'city':
        return ['eq', 'in', 'contains'] as ComparisonOperator[]
      case 'purchased_product':
        return ['ever', 'within_days', 'not_within_days'] as ComparisonOperator[]
      case 'total_orders':
        return ['eq', 'gt', 'gte', 'lt', 'lte'] as ComparisonOperator[]
      case 'average_ticket':
        return ['gt', 'gte', 'lt', 'lte'] as ComparisonOperator[]
      case 'birthday_within_days':
        return ['within_days'] as ComparisonOperator[]
      case 'top_customers_month':
        return ['eq'] as ComparisonOperator[]
      default:
        return ['eq'] as ComparisonOperator[]
    }
  }, [criterion.type])

  const helper = CRITERION_HELPERS[criterion.type]

  const dddCollection = useMemo(
    () =>
      createListCollection({
        items: dddOptions.map((ddd) => ({
          value: ddd,
          label: `DDD ${ddd}`,
        })),
      }),
    [dddOptions],
  )

  const selectedDdds = useMemo(
    () => (Array.isArray(criterion.value) ? (criterion.value as string[]) : []),
    [criterion.value],
  )

  const lastOrderFilter =
    criterion.type === 'last_order_days'
      ? getLastOrderFilterValue(criterion.value)
      : { from: '', to: '' }

  const handleOperatorChange = (operator: ComparisonOperator) => {
    if (criterion.type === 'last_order_days') {
      const current = getLastOrderFilterValue(criterion.value)
      onChange({
        type: criterion.type,
        operator,
        value: serializeLastOrderFilterValue(
          operator === 'between'
            ? { from: current.from, to: current.to }
            : current,
        ),
      })
      return
    }

    onChange({ ...criterion, operator })
  }

  const handleLastOrderFilterChange = (next: LastOrderFilterValue) => {
    onChange({
      ...criterion,
      value: serializeLastOrderFilterValue(next),
    })
  }

  const handleTypeChange = (type: CriterionType) => {
    switch (type) {
      case 'rfv_classification':
        onChange({ type, operator: 'in', value: ['campeao'] })
        break
      case 'phone_ddd':
        onChange({ type, operator: 'in', value: [] })
        break
      case 'neighborhood':
      case 'city':
        onChange({ type, operator: 'eq', value: '' })
        break
      case 'purchased_product':
        onChange({ type, operator: 'ever', value: { productName: '' } })
        break
      case 'whatsapp_verified':
      case 'has_orders':
        onChange({ type, operator: 'eq', value: true })
        break
      case 'birthday_within_days':
        onChange({ type, operator: 'within_days', value: 30 })
        break
      case 'top_customers_month':
        onChange({ type, operator: 'eq', value: 10 })
        break
      default:
        onChange({ type, operator: 'gte', value: 30 })
    }
  }

  return (
    <Stack
      borderWidth="1px"
      borderRadius="md"
      gap={3}
      p={3}
    >
      <HStack align="flex-end">
        <Field.Root flex={1}>
          <Field.Label>O que filtrar</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              onChange={(event) =>
                handleTypeChange(event.currentTarget.value as CriterionType)
              }
              value={criterion.type}
            >
              {Object.entries(CRITERION_LABELS).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Field.Root>

        {!['whatsapp_verified', 'has_orders', 'birthday_within_days', 'top_customers_month'].includes(
          criterion.type,
        ) && (
          <Field.Root flex={1}>
            <Field.Label>Como filtrar</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                onChange={(event) =>
                  handleOperatorChange(event.currentTarget.value as ComparisonOperator)
                }
                value={criterion.operator}
              >
                {operators.map((operator) => (
                  <option
                    key={operator}
                    value={operator}
                  >
                    {OPERATOR_LABELS[operator] ?? operator}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>
        )}
      </HStack>

      {helper ? (
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          {helper}
        </Text>
      ) : null}

      {criterion.type === 'rfv_classification' && (
        <Field.Root>
          <Field.Label>Tipos de cliente</Field.Label>
          <NativeSelect.Root multiple>
            <NativeSelect.Field
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.selectedOptions).map(
                  (option) => option.value,
                )
                onChange({ ...criterion, value: selected })
              }}
              value={(criterion.value as string[]) ?? []}
            >
              {clientTypesOptions.items.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
          <Field.HelperText>
            Segure Ctrl (ou Cmd) para escolher mais de um tipo.
          </Field.HelperText>
        </Field.Root>
      )}

      {criterion.type === 'last_order_days' && (
        <>
          {criterion.operator !== 'between' && (
            <Field.Root>
              <Field.Label>Dias</Field.Label>
              <Input
                onChange={(event) => {
                  const raw = event.currentTarget.value
                  handleLastOrderFilterChange({
                    ...lastOrderFilter,
                    days: raw === '' ? undefined : Number(raw),
                  })
                }}
                type="number"
                value={lastOrderFilter.days ?? ''}
              />
            </Field.Root>
          )}
          <HStack align="flex-end">
            <Field.Root flex={1}>
              <Field.Label>De</Field.Label>
              <Input
                onChange={(event) =>
                  handleLastOrderFilterChange({
                    ...lastOrderFilter,
                    from: event.currentTarget.value,
                  })
                }
                type="date"
                value={lastOrderFilter.from}
              />
            </Field.Root>
            <Field.Root flex={1}>
              <Field.Label>Até</Field.Label>
              <Input
                onChange={(event) =>
                  handleLastOrderFilterChange({
                    ...lastOrderFilter,
                    to: event.currentTarget.value,
                  })
                }
                type="date"
                value={lastOrderFilter.to}
              />
            </Field.Root>
          </HStack>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Exemplo: 30 dias + um intervalo antigo inclui quem sumiu há pelo menos 30 dias e cuja última compra caiu nesse período.
          </Text>
        </>
      )}

      {['total_orders', 'average_ticket'].includes(criterion.type) && (
        <Field.Root>
          <Field.Label>
            {criterion.type === 'average_ticket' ? 'Valor (R$)' : 'Quantidade'}
          </Field.Label>
          <Input
            onChange={(event) =>
              onChange({ ...criterion, value: Number(event.currentTarget.value) })
            }
            type="number"
            value={Number(criterion.value ?? 0)}
          />
        </Field.Root>
      )}

      {criterion.type === 'birthday_within_days' && (
        <Field.Root>
          <Field.Label>Próximos quantos dias?</Field.Label>
          <Input
            min={0}
            onChange={(event) =>
              onChange({ ...criterion, value: Number(event.currentTarget.value) })
            }
            type="number"
            value={Number(criterion.value ?? 30)}
          />
        </Field.Root>
      )}

      {criterion.type === 'top_customers_month' && (
        <Field.Root>
          <Field.Label>Quantos clientes no ranking?</Field.Label>
          <Input
            min={1}
            onChange={(event) =>
              onChange({ ...criterion, value: Number(event.currentTarget.value) })
            }
            type="number"
            value={Number(criterion.value ?? 10)}
          />
        </Field.Root>
      )}

      {criterion.type === 'neighborhood' && (
        <Field.Root>
          <Field.Label>Bairro</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              onChange={(event) =>
                onChange({ ...criterion, value: event.currentTarget.value })
              }
              value={String(criterion.value ?? '')}
            >
              <option value="">Selecione</option>
              {neighborhoodOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Field.Root>
      )}

      {criterion.type === 'city' && (
        <Field.Root>
          <Field.Label>Cidade</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              onChange={(event) =>
                onChange({ ...criterion, value: event.currentTarget.value })
              }
              value={String(criterion.value ?? '')}
            >
              <option value="">Selecione</option>
              {cityOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Field.Root>
      )}

      {criterion.type === 'phone_ddd' && (
        <Field.Root>
          <Field.Label>DDDs</Field.Label>
          {dddOptions.length === 0 ? (
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Nenhum DDD encontrado nos telefones dos seus clientes.
            </Text>
          ) : (
            <>
              <Select.Root
                collection={dddCollection}
                multiple
                onValueChange={({ value }) =>
                  onChange({ ...criterion, value })
                }
                value={selectedDdds}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Selecione um ou mais DDDs" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content maxH="280px">
                    {dddCollection.items.map((item) => (
                      <Select.Item
                        item={item}
                        key={item.value}
                      >
                        {item.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
              <Field.HelperText>
                Selecione um ou mais DDDs.
              </Field.HelperText>
            </>
          )}
        </Field.Root>
      )}

      {criterion.type === 'purchased_product' && (
        <Stack gap={3}>
          <Field.Root>
            <Field.Label>Produto</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                onChange={(event) => {
                  const current =
                    typeof criterion.value === 'object' && criterion.value
                      ? (criterion.value as Record<string, unknown>)
                      : {}
                  onChange({
                    ...criterion,
                    value: { ...current, productName: event.currentTarget.value },
                  })
                }}
                value={
                  typeof criterion.value === 'object' && criterion.value
                    ? String((criterion.value as { productName?: string }).productName ?? '')
                    : String(criterion.value ?? '')
                }
              >
                <option value="">Selecione ou digite abaixo</option>
                {productOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <Input
              mt={2}
              onChange={(event) => {
                const current =
                  typeof criterion.value === 'object' && criterion.value
                    ? (criterion.value as Record<string, unknown>)
                    : {}
                onChange({
                  ...criterion,
                  value: { ...current, productName: event.currentTarget.value },
                })
              }}
              placeholder="Nome do produto"
              value={
                typeof criterion.value === 'object' && criterion.value
                  ? String((criterion.value as { productName?: string }).productName ?? '')
                  : ''
              }
            />
          </Field.Root>

          {['within_days', 'not_within_days'].includes(criterion.operator) && (
            <Field.Root>
              <Field.Label>Nos últimos quantos dias?</Field.Label>
              <Input
                onChange={(event) => {
                  const current =
                    typeof criterion.value === 'object' && criterion.value
                      ? (criterion.value as Record<string, unknown>)
                      : {}
                  onChange({
                    ...criterion,
                    value: { ...current, days: Number(event.currentTarget.value) },
                  })
                }}
                type="number"
                value={
                  typeof criterion.value === 'object' && criterion.value
                    ? Number((criterion.value as { days?: number }).days ?? 30)
                    : 30
                }
              />
            </Field.Root>
          )}
        </Stack>
      )}

      {['whatsapp_verified', 'has_orders'].includes(criterion.type) && (
        <Field.Root>
          <Field.Label>Resposta</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              onChange={(event) =>
                onChange({ ...criterion, value: event.currentTarget.value === 'true' })
              }
              value={String(Boolean(criterion.value))}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Field.Root>
      )}
    </Stack>
  )
}

export function PreviewBox({
  count,
  isLoading,
  compact = false,
}: {
  count?: number
  isLoading?: boolean
  compact?: boolean
}) {
  return (
    <Box
      bg="bg.subtle"
      borderRadius="md"
      p={compact ? 3 : 4}
    >
      <Text fontWeight="medium">Quantos clientes entram nessa lista?</Text>
      <Text
        color="fg.muted"
        fontSize={compact ? 'sm' : 'md'}
      >
        {isLoading
          ? 'Contando clientes...'
          : `${count ?? 0} cliente${(count ?? 0) === 1 ? '' : 's'} no momento`}
      </Text>
    </Box>
  )
}

export function StepIntro({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Stack gap={1}>
      <Text fontWeight="semibold">{title}</Text>
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        {description}
      </Text>
    </Stack>
  )
}

export function WizardNav({
  onBack,
  onNext,
  backLabel = 'Voltar',
  nextLabel = 'Continuar',
  nextDisabled = false,
  nextLoading = false,
  showBack = true,
  secondaryAction,
}: {
  onBack?: () => void
  onNext?: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  showBack?: boolean
  secondaryAction?: ReactNode
}) {
  return (
    <HStack
      justify="space-between"
      pt={2}
    >
      <Box>
        {showBack && onBack ? (
          <Button
            onClick={onBack}
            variant="ghost"
          >
            {backLabel}
          </Button>
        ) : null}
      </Box>
      <HStack>
        {secondaryAction}
        {onNext ? (
          <Button
            disabled={nextDisabled}
            loading={nextLoading}
            onClick={onNext}
          >
            {nextLabel}
          </Button>
        ) : null}
      </HStack>
    </HStack>
  )
}
