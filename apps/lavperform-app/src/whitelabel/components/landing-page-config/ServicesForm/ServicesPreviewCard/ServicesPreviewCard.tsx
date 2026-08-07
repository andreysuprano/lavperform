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
import { LuCircleCheck } from 'react-icons/lu'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './ServicesPreviewCard.types'

function ServicesPreviewCardBase({ data, branding }: Props) {
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
        <Stack gap={6}>
          <VStack gap={2} textAlign="center">
            <Text fontSize="xl" fontWeight="bold" style={{ color: colors.primary }}>
              {data.title || 'Serviços'}
            </Text>
            {data.description ? (
              <Text color="fg.muted" fontSize="sm">
                {data.description}
              </Text>
            ) : null}
          </VStack>

          {items.length === 0 ? (
            <Text color="fg.muted" fontSize="sm" textAlign="center">
              Nenhum serviço adicionado ainda
            </Text>
          ) : (
            <SimpleGrid columns={1} gap={4}>
              {items.map((service, index) => (
                <Card.Root key={`${service.title}-${index}`} shadow="md">
                  <Card.Header pb={2}>
                    <Card.Title
                      fontSize="lg"
                      fontWeight="black"
                      textAlign="center"
                      style={{ color: colors.primary }}
                    >
                      {service.title || 'Serviço'}
                    </Card.Title>
                  </Card.Header>
                  <Card.Body pt={0}>
                    <VStack align="stretch" gap={3}>
                      {service.description ? (
                        <Text color="fg.muted" fontSize="sm" textAlign="center">
                          {service.description}
                        </Text>
                      ) : null}
                      {service.price ? (
                        <Text
                          fontSize="lg"
                          fontWeight="black"
                          textAlign="center"
                          style={{ color: colors.primary }}
                        >
                          {service.price}
                        </Text>
                      ) : null}
                      {(service.vantageList?.length ?? 0) > 0 ? (
                        <Stack gap={2}>
                          {service.vantageList.map((vantage, vIndex) => (
                            <HStack
                              key={`${vantage}-${vIndex}`}
                              align="flex-start"
                              gap={2}
                            >
                              <Icon
                                as={LuCircleCheck}
                                boxSize={4}
                                flexShrink={0}
                                mt={0.5}
                                style={{ color: colors.secondary }}
                              />
                              <Text fontSize="sm">{vantage}</Text>
                            </HStack>
                          ))}
                        </Stack>
                      ) : null}
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

const ServicesPreviewCard = memo(
  ServicesPreviewCardBase
) as typeof ServicesPreviewCardBase

export { ServicesPreviewCard, type Props as ServicesPreviewCardProps }
