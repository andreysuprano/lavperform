import {
  Box,
  Card,
  Container,
  Grid,
  Heading,
  HStack,
  List,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiCheckLine } from 'react-icons/ri'

import { Props } from './ServicesSection.types'

function ServicesSectionBase({ services }: Props) {
  return (
    <Box bg="bg.subtle" id="servicos" py={{ base: 12, md: 20 }}>
      <Container maxW="container.xl">
        <VStack gap={8}>
          <VStack gap={4} textAlign="center">
            <Heading fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
              {services.title}
            </Heading>
            <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
              {services.description}
            </Text>
          </VStack>

          <Grid
            gap={6}
            templateColumns={{
              base: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            }}
            w="full"
          >
            {services.items.map((item, index) => (
              <Card.Root key={index}>
                <Card.Body p={6}>
                  <VStack alignItems="flex-start" gap={4}>
                    <VStack alignItems="flex-start" gap={2} w="full">
                      <Heading fontSize="xl" fontWeight="bold">
                        {item.title}
                      </Heading>
                      <Text color="fg.muted">{item.description}</Text>
                      <Text color="primary.500" fontSize="2xl" fontWeight="bold">
                        {item.price}
                      </Text>
                    </VStack>

                    <List.Root gap={2} w="full">
                      {item.vantageList.map((vantage, vIndex) => (
                        <List.Item key={vIndex}>
                          <HStack gap={2}>
                            <Box color="primary.500">
                              <RiCheckLine />
                            </Box>
                            <Text fontSize="sm">{vantage}</Text>
                          </HStack>
                        </List.Item>
                      ))}
                    </List.Root>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}

const ServicesSection = memo(ServicesSectionBase) as typeof ServicesSectionBase

export { ServicesSection, type Props as ServicesSectionProps }
