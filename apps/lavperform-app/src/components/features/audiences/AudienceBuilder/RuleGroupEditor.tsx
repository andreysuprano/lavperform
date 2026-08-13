import { Button, Field, NativeSelect, Stack, Text } from '@chakra-ui/react'

import type { Criterion, RuleGroup } from '@/types'
import { createEmptyCriterion, isRuleGroup } from '@/types'

import { CriterionEditor } from './CriterionEditor'
import { GROUP_OPERATOR_OPTIONS } from './audienceCopy'

type Props = {
  group: RuleGroup
  onChange: (group: RuleGroup) => void
  productOptions?: string[]
  neighborhoodOptions?: string[]
  cityOptions?: string[]
  dddOptions?: string[]
}

export function RuleGroupEditor({
  group,
  onChange,
  productOptions,
  neighborhoodOptions,
  cityOptions,
  dddOptions,
}: Props) {
  const updateRule = (index: number, rule: Criterion | RuleGroup) => {
    const rules = [...group.rules]
    rules[index] = rule
    onChange({ ...group, rules })
  }

  const removeRule = (index: number) => {
    onChange({
      ...group,
      rules: group.rules.filter((_, ruleIndex) => ruleIndex !== index),
    })
  }

  const addCriterion = () => {
    onChange({
      ...group,
      rules: [...group.rules, createEmptyCriterion()],
    })
  }

  const selectedOption = GROUP_OPERATOR_OPTIONS.find(
    (option) => option.value === group.operator,
  )

  return (
    <Stack gap={3}>
      <Field.Root>
        <Field.Label>Como combinar os filtros</Field.Label>
        <NativeSelect.Root maxW="320px">
          <NativeSelect.Field
            onChange={(event) =>
              onChange({
                ...group,
                operator: event.currentTarget.value as 'AND' | 'OR',
              })
            }
            value={group.operator}
          >
            {GROUP_OPERATOR_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
        {selectedOption ? (
          <Text
            color="fg.muted"
            fontSize="sm"
            mt={1}
          >
            {selectedOption.description}
          </Text>
        ) : null}
      </Field.Root>

      {group.rules.map((rule, index) => (
        <Stack
          gap={2}
          key={`rule-${index}`}
        >
          {isRuleGroup(rule) ? (
            <RuleGroupEditor
              cityOptions={cityOptions}
              dddOptions={dddOptions}
              group={rule}
              neighborhoodOptions={neighborhoodOptions}
              onChange={(updated) => updateRule(index, updated)}
              productOptions={productOptions}
            />
          ) : (
            <CriterionEditor
              cityOptions={cityOptions}
              criterion={rule}
              dddOptions={dddOptions}
              neighborhoodOptions={neighborhoodOptions}
              onChange={(updated) => updateRule(index, updated)}
              productOptions={productOptions}
            />
          )}

          <Button
            alignSelf="flex-end"
            onClick={() => removeRule(index)}
            size="sm"
            variant="ghost"
          >
            Remover filtro
          </Button>
        </Stack>
      ))}

      <Button
        alignSelf="flex-start"
        onClick={addCriterion}
        size="sm"
        variant="outline"
      >
        + Adicionar filtro
      </Button>
    </Stack>
  )
}
