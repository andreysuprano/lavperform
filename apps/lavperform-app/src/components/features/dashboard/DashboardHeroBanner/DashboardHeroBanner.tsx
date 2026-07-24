import { Avatar, Box, Flex, Stack, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'

import { DashboardIncentivizedSalesPanel } from '../DashboardIncentivizedSalesPanel/DashboardIncentivizedSalesPanel'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function DashboardHeroBannerBase() {
  const { colorPalette, colors, texts } = useWhiteLabel()
  const { selectedCompany, user } = useAuth()

  const restaurantName = selectedCompany?.name ?? texts.appShortName
  const userName = user?.userName?.split(' ')[0] ?? 'aí'
  const greeting = getGreeting()

  const gridStyle = useMemo(
    () => ({
      backgroundImage: `
        linear-gradient(to right, color-mix(in srgb, ${colors.primary} 12%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, ${colors.primary} 12%, transparent) 1px, transparent 1px)
      `,
      backgroundSize: '28px 28px',
      maskImage:
        'linear-gradient(to right, black 0%, black 55%, transparent 100%)',
    }),
    [colors.primary]
  )

  return (
    <Box
      bg={{ base: 'bg.inverted', _dark: 'bg.emphasized' }}
      borderColor={{ base: 'whiteAlpha.100', _dark: 'whiteAlpha.50' }}
      borderRadius="xl"
      borderWidth="1px"
      colorPalette={colorPalette}
      minH={{ base: 'auto', md: '200px' }}
      overflow="hidden"
      position="relative"
      w="full"
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
        opacity={0.75}
        pointerEvents="none"
        position="absolute"
        css={gridStyle}
        zIndex={0}
      />

      <Box
        aria-hidden
        bg={`linear-gradient(135deg, color-mix(in srgb, ${colors.primary} 35%, transparent) 0%, transparent 55%)`}
        inset={0}
        pointerEvents="none"
        position="absolute"
        zIndex={0}
      />

      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 5, md: 6 }}
        justify="space-between"
        minH={{ md: '200px' }}
        position="relative"
        px={{ base: 5, md: 8 }}
        py={{ base: 6, md: 7 }}
        zIndex={1}
      >
        <Flex
          align={{ base: 'flex-start', md: 'center' }}
          flex={1}
          gap={{ base: 4, md: 6 }}
          minW={0}
        >
          <Avatar.Root
            borderColor="colorPalette.solid"
            borderWidth="3px"
            boxSize={{ base: '96px', md: '120px' }}
            flexShrink={0}
            fontSize={{ base: '2xl', md: '3xl' }}
          >
            {selectedCompany?.avatarUrl ? (
              <Avatar.Image
                alt={restaurantName}
                src={selectedCompany.avatarUrl}
              />
            ) : null}
            <Avatar.Fallback name={restaurantName} />
          </Avatar.Root>

          <Stack
            flex={1}
            gap={1.5}
            minW={0}
          >
            <Text
              color="colorPalette.solid"
              fontSize="sm"
              fontWeight="semibold"
              letterSpacing="0.02em"
              lineClamp={1}
            >
              {restaurantName}
            </Text>

            <Text
              color={{ base: 'fg.inverted', _dark: 'fg' }}
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="bold"
              letterSpacing="-0.02em"
              lineHeight="1.15"
            >
              {greeting}, {userName}
            </Text>

            <Text
              color={{ base: 'whiteAlpha.800', _dark: 'fg.muted' }}
              fontSize={{ base: 'sm', md: 'md' }}
              fontWeight="medium"
              lineHeight="1.45"
              maxW="42ch"
            >
              Vendas do dia, saúde da base e atalhos para agir rápido.
            </Text>
          </Stack>
        </Flex>

        <DashboardIncentivizedSalesPanel />
      </Flex>
    </Box>
  )
}

const DashboardHeroBanner = memo(
  DashboardHeroBannerBase
) as typeof DashboardHeroBannerBase

export { DashboardHeroBanner }
