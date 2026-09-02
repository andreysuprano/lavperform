"use client"

import { Box, Button, Card, Icon, Stack, Text, VStack } from "@chakra-ui/react"
import { FaMapMarkedAlt } from "react-icons/fa"
import { useState } from "react"

interface LocationItem {
  placeName: string
  address: string
  mapUrl: string
  mapEmbedUrl: string
  googleMapsLink: string
}

interface LocationSectionProps {
  items?: LocationItem[]
}

function buildMapSrc(item: LocationItem) {
  if (item.mapEmbedUrl?.trim()) return item.mapEmbedUrl.trim()
  if (!item.address?.trim()) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(item.address.trim())}&output=embed`
}

function buildMapsLink(item: LocationItem) {
  const shareLink = item.googleMapsLink?.trim() || item.mapUrl?.trim()
  if (shareLink) return shareLink
  if (!item.address?.trim()) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address.trim())}`
}

export function LocationSection({ items = [] }: LocationSectionProps) {
  const validItems = items.filter(
    (item): item is LocationItem =>
      !!item && typeof item === 'object' && (!!item.address || !!item.placeName),
  )

  if (validItems.length === 0) {
    return null
  }

  const [selectedLocation, setSelectedLocation] = useState<LocationItem>(validItems[0])

  // Se houver apenas uma unidade, usa o layout simples
  if (validItems.length === 1) {
    const location = validItems[0]
    const mapSrc = buildMapSrc(location)
    const mapsLink = buildMapsLink(location)
    return (
      <Stack
        direction={{ base: "column", lg: "row" }}
        gap={{ base: 6, md: 8 }}
        align="stretch"
      >
        <Box flex="1" minH={{ base: "300px", md: "400px" }}>
          <Card.Root shadow="xl" overflow="hidden" h="100%">
            <Card.Body p={0} h="100%">
              {mapSrc ? (
                <iframe
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Mapa - ${location.placeName}`}
                />
              ) : null}
            </Card.Body>
          </Card.Root>
        </Box>
        
        <VStack 
          flex="1" 
          justify="center" 
          align="stretch" 
          gap={{ base: 4, md: 6 }}
          p={{ base: 4, md: 6 }}
          bg="white"
          rounded="lg"
          shadow="xl"
        >
          <VStack gap={3} align="start">
            <Text
              fontSize={{ base: "2xl", md: "3xl" }}
              fontWeight="black"
              css={{ color: "var(--brand-primary)" }}
            >
              {location.placeName}
            </Text>
            <Text
              fontSize={{ base: "md", md: "lg" }}
              color="gray.600"
            >
              📍 {location.address}
            </Text>
          </VStack>
          
          {mapsLink ? (
            <Button
              size={{ base: "lg", md: "xl" }}
              rounded={"full"}
              w="full"
              css={{
                background: "var(--brand-primary)",
                color: "white",
                "&:hover": { opacity: 0.9 },
              }}
              asChild
            >
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon>
                  <FaMapMarkedAlt />
                </Icon>
                Ver no Mapa
              </a>
            </Button>
          ) : null}
        </VStack>
      </Stack>
    )
  }

  const selectedMapSrc = buildMapSrc(selectedLocation)

  // Layout para múltiplas unidades: Mapa grande na esquerda + Lista na direita
  return (
    <Stack
      direction={{ base: "column", lg: "row" }}
      gap={{ base: 6, md: 8 }}
      align="stretch"
    >
      {/* Mapa grande na esquerda */}
      <Box flex="2" minH={{ base: "400px", md: "600px" }}>
        <Card.Root shadow="xl" overflow="hidden" h="100%">
          <Card.Body p={0} h="100%">
            {selectedMapSrc ? (
              <iframe
                src={selectedMapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Mapa - ${selectedLocation.placeName}`}
              />
            ) : null}
          </Card.Body>
        </Card.Root>
      </Box>

      {/* Lista de unidades na direita */}
      <VStack 
        flex="1" 
        align="stretch" 
        gap={{ base: 4, md: 4 }}
        minW={{ base: "full", lg: "350px" }}
        maxH={{ base: "none", lg: "600px" }}
        overflowY={{ base: "visible", lg: "auto" }}
        overflowX="visible"
        py={{ base: 0, lg: 1 }}
        px={{ base: 0, lg: 1 }}
        pr={{ base: 0, lg: 3 }}
        css={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "var(--brand-primary)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            opacity: 0.8,
          },
        }}
      >
        {validItems.map((location, index) => {
          const mapsLink = buildMapsLink(location)

          return (
          <Card.Root
            key={index}
            shadow="lg"
            cursor="pointer"
            transition="all 0.3s"
            border="2px solid"
            borderColor={selectedLocation === location ? "var(--brand-primary)" : "transparent"}
            bg={selectedLocation === location ? "white" : "gray.50"}
            _hover={{
              shadow: "xl",
              transform: "translateY(-2px)",
              borderColor: "var(--brand-primary)",
            }}
            onClick={() => setSelectedLocation(location)}
          >
            <Card.Body p={{ base: 4, md: 5 }}>
              <VStack align="start" gap={3}>
                <Text
                  fontSize={{ base: "lg", md: "xl" }}
                  fontWeight="bold"
                  css={{ color: "var(--brand-primary)" }}
                >
                  {location.placeName}
                </Text>
                <Text
                  fontSize={{ base: "sm", md: "md" }}
                  color="gray.600"
                  lineHeight="tall"
                >
                  📍 {location.address}
                </Text>
                
                  {mapsLink ? (
                    <Button
                      size={{ base: "sm", md: "md" }}
                      rounded="full"
                      w="full"
                      mt={2}
                      css={{
                        background: selectedLocation === location 
                          ? "var(--brand-primary)" 
                          : "var(--brand-secondary)",
                        color: "white",
                        "&:hover": { opacity: 0.9 },
                      }}
                      asChild
                    >
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon>
                          <FaMapMarkedAlt />
                        </Icon>
                        Ver no Mapa
                      </a>
                    </Button>
                  ) : null}
              </VStack>
            </Card.Body>
          </Card.Root>
          )
        })}
      </VStack>
    </Stack>
  )
}
