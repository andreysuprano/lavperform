import { Box, Flex, Icon, Stack, Text } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { LuMegaphone } from 'react-icons/lu'

import { useWhiteLabel } from '@/config'

const glowFloatA = keyframes`
  0%, 100% {
    opacity: 0.26;
    transform: scale(1) translate(0, 0);
  }
  50% {
    opacity: 0.44;
    transform: scale(1.18) translate(18px, 12px);
  }
`

const glowFloatB = keyframes`
  0%, 100% {
    opacity: 0.22;
    transform: scale(1) translate(0, 0);
  }
  50% {
    opacity: 0.38;
    transform: scale(1.14) translate(-14px, 10px);
  }
`

const glowFloatC = keyframes`
  0%, 100% {
    opacity: 0.18;
    transform: scale(1) translate(0, 0);
  }
  50% {
    opacity: 0.34;
    transform: scale(1.12) translate(10px, -12px);
  }
`

const reducedMotionStyles = {
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    opacity: 0.3,
    transform: 'none',
  },
}

function CampaignPageBannerBase() {
  const { colorPalette, colors, theme } = useWhiteLabel()
  const bannerSrc = theme.images.bannerCampanhas
  const [imageFailed, setImageFailed] = useState(false)

  const showImage = Boolean(bannerSrc) && !imageFailed

  const handleImageError = useCallback(() => {
    setImageFailed(true)
  }, [])

  const headline =
    theme.id === 'default'
      ? 'Seu restaurante é bom de mais pra passar despercebido!'
      : 'Sua lavanderia é boa de mais pra passar despercebido!'

  const gridStyle = useMemo(
    () => ({
      backgroundImage: `
        linear-gradient(to right, color-mix(in srgb, ${colors.primary} 14%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, ${colors.primary} 14%, transparent) 1px, transparent 1px)
      `,
      backgroundSize: '22px 22px',
    }),
    [colors.primary]
  )

  const glowStyle = useMemo(
    () => (size: string) => ({
      background: `radial-gradient(circle, color-mix(in srgb, ${colors.primary} 80%, white) 0%, color-mix(in srgb, ${colors.primary} 28%, transparent) 42%, transparent 72%)`,
      filter: 'blur(48px)',
      height: size,
      width: size,
    }),
    [colors.primary]
  )

  const glowAnimationA = useMemo(
    () => ({
      ...glowStyle('420px'),
      animation: `${glowFloatA} 6.5s ease-in-out infinite`,
      ...reducedMotionStyles,
    }),
    [glowStyle]
  )

  const glowAnimationB = useMemo(
    () => ({
      ...glowStyle('360px'),
      animation: `${glowFloatB} 8s ease-in-out infinite 1.2s`,
      ...reducedMotionStyles,
    }),
    [glowStyle]
  )

  const glowAnimationC = useMemo(
    () => ({
      ...glowStyle('300px'),
      animation: `${glowFloatC} 7.2s ease-in-out infinite 0.6s`,
      ...reducedMotionStyles,
    }),
    [glowStyle]
  )

  return (
    <Box
      bg={{ base: 'bg.inverted', _dark: 'bg.emphasized' }}
      borderColor={{ base: 'whiteAlpha.100', _dark: 'whiteAlpha.50' }}
      borderRadius="lg"
      borderWidth="1px"
      minH={{ base: 'auto', md: '144px' }}
      overflow="hidden"
      position="relative"
    >
      <Box
        aria-hidden
        borderRadius="full"
        css={glowAnimationA}
        left={{ base: '-230px', md: '-190px' }}
        pointerEvents="none"
        position="absolute"
        top={{ base: '-160px', md: '-130px' }}
        zIndex={0}
      />

      <Box
        aria-hidden
        borderRadius="full"
        bottom={{ base: '-120px', md: '-100px' }}
        css={glowAnimationB}
        left={{ base: '-100px', md: '-20px' }}
        pointerEvents="none"
        position="absolute"
        zIndex={0}
      />

      <Box
        aria-hidden
        borderRadius="full"
        css={glowAnimationC}
        pointerEvents="none"
        position="absolute"
        right={{ base: '-100px', md: '-80px' }}
        top={{ base: '-80px', md: '-60px' }}
        zIndex={0}
      />

      <Box
        aria-hidden
        inset={0}
        opacity={0.55}
        pointerEvents="none"
        position="absolute"
        css={gridStyle}
        zIndex={0}
      />

      <Box
        aria-hidden
        bgGradient={{
          base: 'to-b, blackAlpha.800 0%, blackAlpha.500 45%, transparent 100%',
          md: 'to-r, blackAlpha.900 0%, blackAlpha.650 48%, transparent 72%',
        }}
        inset={0}
        pointerEvents="none"
        position="absolute"
        zIndex={0}
      />

      <Flex
        align={{ md: 'stretch' }}
        direction={{ base: 'column', md: 'row' }}
        minH={{ md: '144px' }}
        position="relative"
        zIndex={1}
      >
        <Stack
          flex={1}
          gap={2}
          justify="center"
          maxW={{ md: '58%' }}
          minW={0}
          pl={{ base: 5, md: 7 }}
          pr={{ base: 5, md: 4 }}
          py={{ base: 4, md: 5 }}
        >
          <Text
            color={colors.primary}
            fontFamily="mono"
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="0.14em"
            textTransform="uppercase"
          >
            Explore os canais
          </Text>

          <Text
            color={{ base: 'fg.inverted', _dark: 'fg' }}
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="bold"
            letterSpacing="-0.02em"
            lineHeight="1.3"
          >
            {headline}
          </Text>

          <Text
            color={{ base: 'whiteAlpha.800', _dark: 'fg.muted' }}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="semibold"
            lineHeight="1.4"
          >
            WhatsApp, SMS, RCS, E-mail. Todos os canais em um lugar só.
          </Text>
        </Stack>

        <Flex
          align="flex-end"
          bottom={0}
          flexShrink={0}
          justify="flex-end"
          minH={{ base: '156px', md: 'auto' }}
          overflow="hidden"
          pointerEvents="none"
          position={{ base: 'relative', md: 'absolute' }}
          right={0}
          top={0}
          w={{ base: 'full', md: '40%', lg: '36%' }}
        >
          {showImage ? (
            <Box
              alt="Mascote divulgando campanhas por WhatsApp, SMS, RCS e E-mail"
              as="img"
              display="block"
              h={{ base: '156px', md: '100%' }}
              maxW="100%"
              objectFit="contain"
              objectPosition="right bottom"
              onError={handleImageError}
              src={bannerSrc}
              w="auto"
            />
          ) : (
            <Flex
              align="center"
              bg="colorPalette.subtle"
              colorPalette={colorPalette}
              h={{ base: '156px', md: '100%' }}
              justify="center"
              w="full"
            >
              <Icon
                boxSize={{ base: 14, md: 16 }}
                color={colors.primary}
              >
                <LuMegaphone />
              </Icon>
            </Flex>
          )}
        </Flex>
      </Flex>
    </Box>
  )
}

const CampaignPageBanner = memo(
  CampaignPageBannerBase
) as typeof CampaignPageBannerBase

export { CampaignPageBanner }
