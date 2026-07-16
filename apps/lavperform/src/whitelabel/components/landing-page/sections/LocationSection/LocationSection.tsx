import {
  Box,
  Button,
  Container,
  HStack,
  Heading,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiMapPinLine } from 'react-icons/ri'

import { normalizeLocationData } from '@/whitelabel/utils'

import { Props } from './LocationSection.types'

function LocationSectionBase({ location }: Props) {
  const normalized = normalizeLocationData(location)
  const items = normalized.items

  return (
    <Box bg="bg" id="localizacao" py={{ base: 12, md: 20 }}>
      <Container maxW="container.xl">
        <VStack gap={8}>
          <VStack gap={4} textAlign="center">
            <Heading fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
              {normalized.title}
            </Heading>
            <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
              {normalized.description}
            </Text>
          </VStack>

          <SimpleGrid
            columns={{ base: 1, md: items.length > 1 ? 2 : 1 }}
            gap={8}
            w="full"
          >
            {items.map((item, index) => (
              <Stack gap={8} key={item.id ?? index}>
                <VStack alignItems="flex-start" flex={1} gap={4}>
                  <Heading fontSize="xl" fontWeight="bold">
                    {item.placeName}
                  </Heading>
                  <HStack gap={2}>
                    <Box color="primary.500">
                      <RiMapPinLine />
                    </Box>
                    <Text>{item.address}</Text>
                  </HStack>
                  {item.googleMapsLink && (
                    <Button
                      as="a"
                      href={item.googleMapsLink}
                      target="_blank"
                      variant="outline"
                    >
                      Ver no Google Maps
                    </Button>
                  )}
                </VStack>

                {item.mapEmbedUrl && (
                  <Box h={{ base: '300px', md: '400px' }} w="full">
                    <iframe
                      allowFullScreen
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={item.mapEmbedUrl}
                      style={{ border: 0 }}
                      width="100%"
                    />
                  </Box>
                )}
              </Stack>
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  )
}

const LocationSection = memo(LocationSectionBase) as typeof LocationSectionBase

export { LocationSection, type Props as LocationSectionProps }
