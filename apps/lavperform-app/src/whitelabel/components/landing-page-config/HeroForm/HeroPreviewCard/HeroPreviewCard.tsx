import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import {
  LuClock,
  LuCreditCard,
  LuMapPin,
} from 'react-icons/lu'

import { useWhiteLabel } from '@/config'

import { Props } from './HeroPreviewCard.types'

function HeroPreviewCardBase({ data }: Props) {
  const { colorPalette } = useWhiteLabel()

  const {
    title,
    highlightWord,
    subtitle,
    location,
    hours,
    payment,
    ctaText,
    ctaLink,
    backgroundImage,
  } = data

  // Função para destacar a palavra no título
  const renderTitle = () => {
    if (!title) return 'Título do Hero'
    if (!highlightWord) return title

    const parts = title.split(highlightWord)
    if (parts.length === 1) return title

    return (
      <Text as="span">
        {parts[0]}
        <Text
          as="span"
          color={`${colorPalette}.500`}
          fontWeight="bold"
        >
          {highlightWord}
        </Text>
        {parts[1]}
      </Text>
    )
  }

  return (
    <Card.Root
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
      overflow="hidden"
    >
      {backgroundImage && (
        <Box
          position="absolute"
          inset={0}
          zIndex={0}
        >
          <Image
            alt="Background"
            h="full"
            objectFit="cover"
            opacity={0.15}
            src={backgroundImage}
            w="full"
          />
        </Box>
      )}
      <Card.Body
        bg={backgroundImage ? 'bg.subtle' : 'bg'}
        position="relative"
        py={8}
        zIndex={1}
      >
        <Stack
          gap={6}
          textAlign="center"
        >
          {/* Título com palavra destacada */}
          <Stack gap={2}>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              lineHeight="shorter"
            >
              {renderTitle()}
            </Text>
            {subtitle && (
              <Text
                color="fg.muted"
                fontSize="md"
              >
                {subtitle}
              </Text>
            )}
          </Stack>

          {/* Localização */}
          {location && (
            <HStack
              gap={2}
              justifyContent="center"
            >
              <Icon
                as={LuMapPin}
                color="fg.muted"
                size="sm"
              />
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {location}
              </Text>
            </HStack>
          )}

          {/* Cards de Informação */}
          <HStack
            flexWrap="wrap"
            gap={3}
            justifyContent="center"
          >
            {/* Horário */}
            {(hours?.label || hours?.time || hours?.days) && (
              <Badge
                as="div"
                colorPalette="gray"
                px={3}
                py={2}
                variant="subtle"
              >
                <HStack gap={2}>
                  <Icon
                    as={LuClock}
                    size="sm"
                  />
                  <Stack gap={0}>
                    {hours.label && (
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                      >
                        {hours.label}
                      </Text>
                    )}
                    {(hours.time || hours.days) && (
                      <Text
                        color="fg.muted"
                        fontSize="xs"
                      >
                        {hours.time || hours.days}
                      </Text>
                    )}
                  </Stack>
                </HStack>
              </Badge>
            )}

            {/* Formas de Pagamento */}
            {(payment?.label || payment?.methods) && (
              <Badge
                as="div"
                colorPalette="gray"
                px={3}
                py={2}
                variant="subtle"
              >
                <HStack gap={2}>
                  <Icon
                    as={LuCreditCard}
                    size="sm"
                  />
                  <Stack gap={0}>
                    {payment.label && (
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                      >
                        {payment.label}
                      </Text>
                    )}
                    {payment.methods && (
                      <Text
                        color="fg.muted"
                        fontSize="xs"
                      >
                        {payment.methods}
                      </Text>
                    )}
                  </Stack>
                </HStack>
              </Badge>
            )}
          </HStack>

          {/* CTA Button */}
          {ctaText && (
            <Button
              colorPalette={colorPalette}
              size="lg"
              variant="solid"
            >
              {ctaText}
            </Button>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const HeroPreviewCard = memo(HeroPreviewCardBase) as typeof HeroPreviewCardBase

export { HeroPreviewCard, type Props as HeroPreviewCardProps }
