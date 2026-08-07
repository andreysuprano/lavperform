import { Accordion, Card, Stack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './FaqPreviewCard.types'

function FaqPreviewCardBase({ data, branding }: Props) {
  const colors = getPreviewBrandColors(branding)
  const items = data.items ?? []

  return (
    <Card.Root
      overflow="hidden"
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
    >
      <Card.Body bg="bg" p={6}>
        <Stack gap={5}>
          <VStack gap={2} textAlign="center">
            <Text fontSize="xl" fontWeight="bold" style={{ color: colors.primary }}>
              {data.title || 'Perguntas Frequentes'}
            </Text>
            {data.description ? (
              <Text color="fg.muted" fontSize="sm">
                {data.description}
              </Text>
            ) : null}
          </VStack>

          {items.length === 0 ? (
            <Text color="fg.muted" fontSize="sm" textAlign="center">
              Nenhuma pergunta adicionada ainda
            </Text>
          ) : (
            <Accordion.Root collapsible variant="enclosed" w="full">
              {items.map((item, index) => (
                <Accordion.Item
                  key={item.value || `${item.title}-${index}`}
                  value={item.value || String(index)}
                >
                  <Accordion.ItemTrigger py={3}>
                    <Text
                      flex="1"
                      fontSize="sm"
                      fontWeight="semibold"
                      textAlign="left"
                    >
                      {item.title || 'Pergunta'}
                    </Text>
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    {item.text ? (
                      <Text
                        color="fg.muted"
                        dangerouslySetInnerHTML={{ __html: item.text }}
                        fontSize="sm"
                        lineHeight="1.7"
                        whiteSpace="pre-wrap"
                      />
                    ) : (
                      <Text color="fg.muted" fontSize="sm">
                        Sem resposta
                      </Text>
                    )}
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const FaqPreviewCard = memo(FaqPreviewCardBase) as typeof FaqPreviewCardBase

export { FaqPreviewCard, type Props as FaqPreviewCardProps }
