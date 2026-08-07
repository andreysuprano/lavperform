import {
  Box,
  Button,
  Card,
  Icon,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useEffect, useMemo, useState } from 'react'
import { FaMapMarkedAlt } from 'react-icons/fa'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './LocationPreviewCard.types'

function buildMapSrc(address?: string, mapEmbedUrl?: string) {
  if (mapEmbedUrl?.trim()) return mapEmbedUrl.trim()
  if (!address?.trim()) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(address.trim())}&output=embed`
}

function LocationPreviewCardBase({ data, branding }: Props) {
  const colors = getPreviewBrandColors(branding)
  const items = data.items ?? []
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (selectedIndex > items.length - 1) {
      setSelectedIndex(Math.max(items.length - 1, 0))
    }
  }, [items.length, selectedIndex])

  const selected = items[selectedIndex]
  const mapSrc = useMemo(
    () => buildMapSrc(selected?.address, selected?.mapEmbedUrl),
    [selected?.address, selected?.mapEmbedUrl]
  )

  return (
    <Card.Root
      overflow="hidden"
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
    >
      <Card.Body bg="bg.subtle" p={6}>
        <Stack gap={5}>
          <VStack gap={2} textAlign="center">
            <Text fontSize="xl" fontWeight="bold" style={{ color: colors.primary }}>
              {data.title || 'Localização'}
            </Text>
            {data.description ? (
              <Text color="fg.muted" fontSize="sm">
                {data.description}
              </Text>
            ) : null}
          </VStack>

          {items.length === 0 ? (
            <Text color="fg.muted" fontSize="sm" textAlign="center">
              Nenhuma unidade adicionada ainda
            </Text>
          ) : (
            <Stack gap={4}>
              <Box
                bg="bg"
                borderRadius="lg"
                minH="180px"
                overflow="hidden"
                shadow="md"
              >
                {mapSrc ? (
                  <iframe
                    allowFullScreen
                    height="180"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                    style={{ border: 0, width: '100%' }}
                    title={`Mapa - ${selected?.placeName || 'Localização'}`}
                    width="100%"
                  />
                ) : (
                  <VStack h="180px" justify="center" p={4}>
                    <Text color="fg.muted" fontSize="sm" textAlign="center">
                      Mapa será exibido com um endereço ou embed válido
                    </Text>
                  </VStack>
                )}
              </Box>

              {items.length > 1 ? (
                <Stack gap={2}>
                  {items.map((location, index) => {
                    const isSelected = index === selectedIndex
                    return (
                      <Card.Root
                        key={location.id ?? `${location.placeName}-${index}`}
                        borderColor={isSelected ? colors.primary : 'transparent'}
                        borderWidth="2px"
                        cursor="pointer"
                        onClick={() => setSelectedIndex(index)}
                        shadow="sm"
                      >
                        <Card.Body p={3}>
                          <Text
                            fontSize="sm"
                            fontWeight="bold"
                            style={{ color: colors.primary }}
                          >
                            {location.placeName || 'Unidade'}
                          </Text>
                          {location.address ? (
                            <Text color="fg.muted" fontSize="xs" mt={1}>
                              {location.address}
                            </Text>
                          ) : null}
                        </Card.Body>
                      </Card.Root>
                    )
                  })}
                </Stack>
              ) : (
                <VStack
                  align="stretch"
                  bg="bg"
                  borderRadius="lg"
                  gap={3}
                  p={4}
                  shadow="md"
                >
                  <Text
                    fontSize="lg"
                    fontWeight="black"
                    style={{ color: colors.primary }}
                  >
                    {selected?.placeName || 'Unidade'}
                  </Text>
                  {selected?.address ? (
                    <Text color="fg.muted" fontSize="sm">
                      📍 {selected.address}
                    </Text>
                  ) : null}
                  <Button
                    pointerEvents="none"
                    rounded="full"
                    size="sm"
                    style={{ background: colors.primary, color: 'white' }}
                    w="full"
                  >
                    <Icon as={FaMapMarkedAlt} />
                    Ver no Mapa
                  </Button>
                </VStack>
              )}
            </Stack>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const LocationPreviewCard = memo(
  LocationPreviewCardBase
) as typeof LocationPreviewCardBase

export { LocationPreviewCard, type Props as LocationPreviewCardProps }
