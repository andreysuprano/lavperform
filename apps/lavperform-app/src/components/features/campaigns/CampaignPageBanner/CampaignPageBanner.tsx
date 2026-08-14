import { Box, Flex, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import {
  LuMail,
  LuMegaphone,
  LuMessageCircle,
  LuMessageSquareText,
  LuSmartphone,
} from 'react-icons/lu'

import { useWhiteLabel } from '@/config'

const CHANNELS = [
  { label: 'WhatsApp', icon: LuMessageCircle },
  { label: 'SMS', icon: LuSmartphone },
  { label: 'RCS', icon: LuMessageSquareText },
  { label: 'E-mail', icon: LuMail },
] as const

function CampaignPageBannerBase() {
  const { colorPalette, colors, theme } = useWhiteLabel()
  const bannerSrc = theme.images.bannerCampanhas
  const [imageFailed, setImageFailed] = useState(false)

  const showImage = Boolean(bannerSrc) && !imageFailed

  const handleImageError = useCallback(() => {
    setImageFailed(true)
  }, [])

  const isDefaultTheme = theme.id === 'default'
  const businessLabel = isDefaultTheme ? 'restaurante' : 'lavanderia'
  const businessPossessive = isDefaultTheme ? 'Seu' : 'Sua'

  const gridStyle = useMemo(
    () => ({
      backgroundImage: `
        linear-gradient(to right, color-mix(in srgb, ${colors.primary} 10%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, ${colors.primary} 10%, transparent) 1px, transparent 1px)
      `,
      backgroundSize: '24px 24px',
      maskImage:
        'linear-gradient(to right, black 0%, black 52%, transparent 88%)',
    }),
    [colors.primary]
  )

  return (
    <Box
      bg={{ base: 'bg.inverted', _dark: 'bg.emphasized' }}
      borderColor={{ base: 'whiteAlpha.100', _dark: 'whiteAlpha.50' }}
      borderRadius="lg"
      borderWidth="1px"
      colorPalette={colorPalette}
      minH={{ base: 'auto', md: '168px' }}
      overflow="hidden"
      position="relative"
    >
      <Box
        aria-hidden
        bg="colorPalette.solid"
        h="3px"
        left={0}
        pointerEvents="none"
        position="absolute"
        right={0}
        top={0}
        zIndex={2}
      />

      <Box
        aria-hidden
        inset={0}
        opacity={0.7}
        pointerEvents="none"
        position="absolute"
        css={gridStyle}
        zIndex={0}
      />

      <Flex
        align={{ md: 'stretch' }}
        direction={{ base: 'column', md: 'row' }}
        minH={{ md: '168px' }}
        position="relative"
        zIndex={1}
      >
        <Stack
          flex={1}
          gap={3}
          justify="center"
          maxW={{ md: '58%' }}
          minW={0}
          pl={{ base: 5, md: 7 }}
          pr={{ base: 5, md: 4 }}
          py={{ base: 5, md: 6 }}
        >
          <HStack gap={2}>
            <Box
              aria-hidden
              bg="colorPalette.solid"
              borderRadius="full"
              h="2px"
              w={4}
            />
            <Text
              color="colorPalette.solid"
              fontFamily="mono"
              fontSize="2xs"
              fontWeight="bold"
              letterSpacing="0.14em"
              textTransform="uppercase"
            >
              Explore os canais
            </Text>
          </HStack>

          <Text
            color={{ base: 'fg.inverted', _dark: 'fg' }}
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="bold"
            letterSpacing="-0.02em"
            lineHeight="1.25"
          >
            {businessPossessive} {businessLabel} é{' '}
            <Box
              as="mark"
              bg="colorPalette.solid"
              borderRadius="sm"
              color="#1a1600"
              display="inline"
              fontWeight="extrabold"
              px={1.5}
              py={0.5}
              whiteSpace="nowrap"
            >
              bom de mais
            </Box>{' '}
            pra passar despercebido!
          </Text>

          <Text
            color={{ base: 'whiteAlpha.800', _dark: 'fg.muted' }}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="medium"
            lineHeight="1.4"
            maxW="42ch"
          >
            Todos os canais em um lugar só. Dispare, acompanhe e venda de novo.
          </Text>

          <HStack
            flexWrap="wrap"
            gap={1.5}
            pt={0.5}
          >
            {CHANNELS.map(({ label, icon: ChannelIcon }) => (
              <HStack
                key={label}
                bg={{ base: 'whiteAlpha.100', _dark: 'blackAlpha.400' }}
                borderColor={{ base: 'whiteAlpha.200', _dark: 'whiteAlpha.100' }}
                borderRadius="md"
                borderWidth="1px"
                color={{ base: 'whiteAlpha.900', _dark: 'fg' }}
                fontFamily="mono"
                fontSize="2xs"
                fontWeight="bold"
                gap={1.5}
                letterSpacing="0.04em"
                px={2}
                py={1}
                textTransform="uppercase"
              >
                <Icon boxSize={3}>
                  <ChannelIcon />
                </Icon>
                <Text as="span">{label}</Text>
              </HStack>
            ))}
          </HStack>
        </Stack>

        
      </Flex>
    </Box>
  )
}

const CampaignPageBanner = memo(
  CampaignPageBannerBase
) as typeof CampaignPageBannerBase

export { CampaignPageBanner }
