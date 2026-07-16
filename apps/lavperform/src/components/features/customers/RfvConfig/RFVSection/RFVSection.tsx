import { Card, Stack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

import type { RFVLevel } from '@/types'

import { RFVLevelItem } from '../RFVLevelItem/RFVLevelItem'
import type { Props } from './RFVSection.types'

function buildRowCopy(params: {
  dimension: RFVLevel['dimension']
  badgeLevel: number
}): { beforeInput: string; afterInput?: string } {
  const { dimension, badgeLevel } = params

  if (dimension === 'RECENCY') {
    if (badgeLevel === 5) return { beforeInput: 'Até', afterInput: 'dias desde o último pedido' }
    if (badgeLevel === 4) return { beforeInput: 'De 11 a', afterInput: 'dias desde o último pedido' }
    if (badgeLevel === 3) return { beforeInput: 'De 16 a', afterInput: 'dias desde o último pedido' }
    if (badgeLevel === 2) return { beforeInput: 'De 46 a', afterInput: 'dias desde o último pedido' }
    return { beforeInput: 'Acima de', afterInput: 'dias desde o último pedido' }
  }

  if (dimension === 'FREQUENCY') {
    if (badgeLevel === 5) return { beforeInput: 'A partir de', afterInput: 'pedidos feitos.' }
    if (badgeLevel === 4) return { beforeInput: 'De', afterInput: 'a 9 pedidos feitos.' }
    if (badgeLevel === 3) return { beforeInput: 'De', afterInput: 'a 7 pedidos feitos.' }
    if (badgeLevel === 2) return { beforeInput: 'De', afterInput: 'a 4 pedidos feitos.' }
    return { beforeInput: 'Até', afterInput: 'pedidos feitos.' }
  }

  // MONETARY
  if (badgeLevel === 5) return { beforeInput: 'Ticket médio a partir de R$' }
  if (badgeLevel === 4) return { beforeInput: 'Ticket médio de R$', afterInput: 'a R$69,99' }
  if (badgeLevel === 3) return { beforeInput: 'Ticket médio de R$', afterInput: 'a R$58,99' }
  if (badgeLevel === 2) return { beforeInput: 'Ticket médio de R$', afterInput: 'a R$38,99' }
  return { beforeInput: 'Ticket médio até R$' }
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
              const { beforeInput, afterInput } = buildRowCopy({ dimension, badgeLevel })

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

