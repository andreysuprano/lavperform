import { Card, Stack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

import type { RFVLevel } from '@/types'

import { RFVLevelItem } from '../RFVLevelItem/RFVLevelItem'
import type { Props } from './RFVSection.types'

function formatMinValue(
  dimension: RFVLevel['dimension'],
  minValue: number | null
): string {
  const value = minValue ?? 0

  if (dimension === 'MONETARY') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return String(Math.round(value))
}

/**
 * Monta o texto de intervalo de cada nível a partir dos valores reais vindos do
 * backend (level.minValue). O input mostra o limite superior (level.maxValue),
 * que é o threshold real; os níveis extremos (5 e 1) são abertos.
 */
function buildRowCopy(params: {
  dimension: RFVLevel['dimension']
  badgeLevel: number
  level: RFVLevel
}): { beforeInput: string; afterInput?: string } {
  const { dimension, badgeLevel, level } = params
  const min = formatMinValue(dimension, level.minValue)

  if (dimension === 'RECENCY') {
    if (badgeLevel === 5) return { beforeInput: 'Até', afterInput: 'dias desde a última venda' }
    if (badgeLevel === 1) return { beforeInput: 'Acima de', afterInput: 'dias desde a última venda' }
    return { beforeInput: `De ${min} a`, afterInput: 'dias desde a última venda' }
  }

  if (dimension === 'FREQUENCY') {
    if (badgeLevel === 5) return { beforeInput: 'A partir de', afterInput: 'vendas feitas.' }
    if (badgeLevel === 1) return { beforeInput: 'Até', afterInput: 'vendas feitas.' }
    return { beforeInput: `De ${min} a`, afterInput: 'vendas feitas.' }
  }

  // MONETARY (ticket médio)
  if (badgeLevel === 5) return { beforeInput: 'Ticket médio a partir de R$' }
  if (badgeLevel === 1) return { beforeInput: 'Ticket médio até R$' }
  return { beforeInput: `Ticket médio de R$ ${min} a R$` }
}

function RFVSectionBase({
  title,
  description,
  dimension,
  levels,
  onLevelChange,
}: Props) {
  return (
    <Card.Root height="full">
      <Card.Body>
        <Stack gap={4}>
          <Stack gap={1}>
            <Text fontSize="md" fontWeight="bold">
              {title}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {description}
            </Text>
          </Stack>

          <VStack align="stretch" gap={3}>
            {levels.map((level, index) => {
              const badgeLevel = levels.length - index
              const { beforeInput, afterInput } = buildRowCopy({ dimension, badgeLevel, level })

              return (
              <RFVLevelItem
                key={level.id}
                level={badgeLevel}
                value={level.maxValue}
                beforeInput={beforeInput}
                afterInput={afterInput}
                step={dimension === 'MONETARY' ? 0.01 : undefined}
                onChange={(value) =>
                  onLevelChange(level.id, { maxValue: value } as Partial<RFVLevel>)
                }
              />
              )
            })}
          </VStack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const RFVSection = memo(RFVSectionBase) as typeof RFVSectionBase

export { RFVSection, type Props as RFVSectionProps }

