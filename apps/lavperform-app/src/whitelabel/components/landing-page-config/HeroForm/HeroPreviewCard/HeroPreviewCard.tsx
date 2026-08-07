import {
  Box,
  Button,
  Card,
  HStack,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { LuClock, LuCreditCard } from 'react-icons/lu'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './HeroPreviewCard.types'

function HeroPreviewCardBase({ data, branding }: Props) {
  const colors = getPreviewBrandColors(branding)

  const {
    title,
    highlightWord,
    subtitle,
    location,
    hours,
    payment,
    ctaText,
    backgroundImage,
  } = data

  const renderTitle = () => {
    if (!title) return 'Título do Banner'
    if (!highlightWord || !title.includes(highlightWord)) return title

    const parts = title.split(highlightWord)
    return (
      <Text as="span">
        {parts[0]}
        <Text as="span" fontWeight="bold" opacity={0.9}>
          {highlightWord}
        </Text>
        {parts.slice(1).join(highlightWord)}
      </Text>
    )
  }

  return (
    <Card.Root
      overflow="hidden"
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
    >
      <Box position="relative">
        <Box
          inset={0}
          position="absolute"
          style={{
            backgroundImage: backgroundImage
              ? `url('${backgroundImage}')`
              : undefined,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
          zIndex={0}
        />
        <Box
          inset={0}
          opacity={0.65}
          position="absolute"
          style={{
            backgroundImage: `linear-gradient(135deg, ${colors.tertiary}, ${colors.secondary})`,
          }}
          zIndex={1}
        />

        <Stack gap={5} p={5} position="relative" zIndex={2}>
          <Stack gap={3}>
            <Text
              color="white"
              fontSize="xl"
              fontWeight="bold"
              lineHeight="shorter"
            >
              {renderTitle()}
            </Text>
            {(subtitle || location) && (
              <Text color="whiteAlpha.900" fontSize="sm">
                {subtitle || location}
              </Text>
            )}

            <Stack gap={2}>
              {(hours?.label || hours?.days || hours?.time) && (
                <HStack
                  borderRadius="md"
                  color="white"
                  gap={2}
                  opacity={0.95}
                  p={3}
                  style={{ background: colors.secondary }}
                >
                  <Icon as={LuClock} boxSize={4} />
                  <Stack gap={0}>
                    {hours.label ? (
                      <Text fontSize="xs" fontWeight="bold">
                        {hours.label}
                      </Text>
                    ) : null}
                    <Text fontSize="xs">{hours.days || hours.time}</Text>
                  </Stack>
                </HStack>
              )}

              {(payment?.label || payment?.methods) && (
                <HStack
                  borderRadius="md"
                  color="white"
                  gap={2}
                  opacity={0.95}
                  p={3}
                  style={{ background: colors.secondary }}
                >
                  <Icon as={LuCreditCard} boxSize={4} />
                  <Stack gap={0}>
                    {payment.label ? (
                      <Text fontSize="xs" fontWeight="bold">
                        {payment.label}
                      </Text>
                    ) : null}
                    {payment.methods ? (
                      <Text fontSize="xs">{payment.methods}</Text>
                    ) : null}
                  </Stack>
                </HStack>
              )}
            </Stack>
          </Stack>

          <Card.Root bg="bg" textAlign="center">
            <Card.Header p={3}>
              <Box
                borderRadius="lg"
                color="white"
                p={3}
                style={{ background: colors.primary }}
              >
                <Text fontSize="sm" fontWeight="bold">
                  {branding?.slogan || 'Slogan da marca'}
                </Text>
              </Box>
            </Card.Header>
            <Card.Body gap={3} p={4} pt={0}>
              <Text
                fontSize="sm"
                fontWeight="bold"
                style={{ color: colors.primary }}
              >
                {branding?.name
                  ? `${branding.name} - Lave e seque suas roupas com qualidade`
                  : 'Nome da marca'}
              </Text>
              {ctaText ? (
                <Button
                  pointerEvents="none"
                  rounded="full"
                  size="sm"
                  style={{ background: colors.primary, color: 'white' }}
                  w="full"
                >
                  <HStack gap={2}>
                    <Icon as={FaWhatsapp} />
                    <Text>{ctaText}</Text>
                  </HStack>
                </Button>
              ) : null}
              <Text color="fg.muted" fontSize="2xs" textTransform="uppercase">
                Menos trabalho, mais economia!
              </Text>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Box>
    </Card.Root>
  )
}

const HeroPreviewCard = memo(HeroPreviewCardBase) as typeof HeroPreviewCardBase

export { HeroPreviewCard, type Props as HeroPreviewCardProps }
