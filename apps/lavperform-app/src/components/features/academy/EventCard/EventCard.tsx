import { Badge, Box, Flex, Heading, Image, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { useWhiteLabel } from '@/config'

import type { Props } from './EventCard.types'

function EventCardBase({
  title,
  description,
  eventDate,
  coverImage,
  ctaLabel,
  ctaUrl,
  isLive = false,
  onFormatDate,
}: Props) {
  const { colorPalette } = useWhiteLabel()

  return (
    <Box
      _hover={{
        bg: 'bg.muted',
        textDecoration: 'none',
      }}
      asChild
      borderRadius="md"
      borderWidth={1}
      className="embla__slide"
      display="flex"
      flexDirection="column"
      minW={{ base: '70%', md: '350px' }}
      p={2}
      w={{ base: '70%', md: '350px' }}
    >
      <a
        href={ctaUrl}
        rel="noopener noreferrer"
        style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        target="_blank"
      >
        <Flex
          flex={1}
          flexDirection={{ base: 'column', sm: 'row' }}
          gap={3}
        >
          {/* Imagem do Evento */}
          {coverImage && (
            <Box flexShrink={0}>
              <Image
                alt={title}
                borderRadius="md"
                h="80px"
                loading="lazy"
                objectFit="cover"
                src={coverImage}
                w="80px"
              />
            </Box>
          )}

          {/* Detalhes do Evento */}
          <Stack
            flex={1}
            gap={1}
          >
            <Flex
              alignItems="center"
              gap={1}
            >
              <Heading
                lineClamp={2}
                size="xs"
              >
                {title}
              </Heading>
              {isLive && (
                <Badge
                  colorPalette="red"
                  variant="solid"
                >
                  Ao Vivo
                </Badge>
              )}
            </Flex>

            <Text
              color="fg.muted"
              fontSize="xs"
              lineClamp={2}
            >
              {description}
            </Text>

            <Flex
              alignItems="center"
              gap={2}
            >
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                {onFormatDate(eventDate)}
              </Text>
              <Badge
                colorPalette={colorPalette}
                size="xs"
                variant="subtle"
              >
                {ctaLabel}
              </Badge>
            </Flex>
          </Stack>
        </Flex>
      </a>
    </Box>
  )
}

const EventCard = memo(EventCardBase) as typeof EventCardBase

export { EventCard, type Props as EventCardProps }
