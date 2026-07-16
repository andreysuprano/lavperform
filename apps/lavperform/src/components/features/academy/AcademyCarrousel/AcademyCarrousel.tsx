import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'

import { Carousel, LoadingState } from '@/components'
import { useWhiteLabel } from '@/config'
import { useCarrouselItems } from '@/hooks/queries'
import type { CarrouselItem } from '@/types'

function AcademyCarrousel() {
  const { colorPalette, images } = useWhiteLabel()

  const { data: items, isLoading } = useCarrouselItems()

  if (isLoading) {
    return <LoadingState />
  }

  if (!items || items.length === 0) {
    return null
  }

  return (
    <Carousel<CarrouselItem>
      height={{ base: '300px', md: '350px' }}
      items={items}
      renderItem={(item) => (
        <Box
          backgroundPosition="center"
          backgroundSize="cover"
          bgImage={`linear-gradient(to right, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.1)), url(${
            item.thumbnailUrl || images.defaultBackground
          })`}
          h={{ base: '300px', md: '350px' }}
        >
          <Stack
            gap={2}
            h="100%"
            justifyContent="center"
            maxW="3xl"
            px={{ base: 8, md: 24 }}
          >
            <Heading
              color="white"
              fontWeight="bolder"
              lineClamp={2}
              size={{ base: 'lg', md: '2xl' }}
            >
              {item.title}
            </Heading>
            <Text
              color="whiteAlpha.800"
              fontSize={{ base: 'sm', md: 'md' }}
              lineClamp={{ base: 3, md: 4 }}
              mb={4}
            >
              {item.description}
            </Text>
            {item.ctaUrl && item.ctaLabel && (
              <Box>
                <Button
                  asChild
                  colorPalette={colorPalette}
                  variant="solid"
                >
                  <a
                    href={item.ctaUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {item.ctaLabel}
                  </a>
                </Button>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    />
  )
}

export { AcademyCarrousel }
