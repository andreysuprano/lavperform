import {
  Card,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { FaStar } from 'react-icons/fa'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './TestimonialsPreviewCard.types'

function TestimonialsPreviewCardBase({ data, branding }: Props) {
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
              {data.title || 'Avaliações'}
            </Text>
            {data.description ? (
              <Text color="fg.muted" fontSize="sm">
                {data.description}
              </Text>
            ) : null}
          </VStack>

          {items.length === 0 ? (
            <Text color="fg.muted" fontSize="sm" textAlign="center">
              Nenhum depoimento adicionado ainda
            </Text>
          ) : (
            <SimpleGrid columns={1} gap={3}>
              {items.map((testimonial, index) => (
                <Card.Root key={`${testimonial.author}-${index}`} shadow="md">
                  <Card.Header pb={2}>
                    <HStack color="orange.400" gap={1} justify="center">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Icon key={starIndex} as={FaStar} boxSize={3.5} />
                      ))}
                    </HStack>
                  </Card.Header>
                  <Card.Body pt={0}>
                    <VStack gap={3}>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                        fontStyle="italic"
                        textAlign="center"
                      >
                        &quot;{testimonial.quote || 'Depoimento'}&quot;
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        style={{ color: colors.primary }}
                      >
                        {testimonial.author || 'Cliente'}
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const TestimonialsPreviewCard = memo(
  TestimonialsPreviewCardBase
) as typeof TestimonialsPreviewCardBase

export {
  TestimonialsPreviewCard,
  type Props as TestimonialsPreviewCardProps,
}
