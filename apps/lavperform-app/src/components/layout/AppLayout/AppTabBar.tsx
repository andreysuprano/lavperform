import { Box, Icon, Text } from '@chakra-ui/react'
import { LuEllipsis, LuHeart, LuHouse, LuShare2, LuUsers } from 'react-icons/lu'
import { NavLink, useLocation } from 'react-router-dom'

import { useColorModeValue } from '@/components/ui/color-mode'

import { isTabActive } from './phoneTitle'
import { TAB_BAR_HEIGHT } from './shellMode'
import { shellDark } from './shellPalette'

const TABS = [
  { label: 'Início', href: '/dashboard', icon: LuHouse },
  { label: 'Clientes', href: '/customers', icon: LuUsers },
  { label: 'Redes Sociais', href: '/social/generator', icon: LuShare2, dot: true },
  { label: 'Fidelização', href: '/campaigns', icon: LuHeart },
  { label: 'Mais', href: '/mais', icon: LuEllipsis },
] as const

export function AppTabBar() {
  const { pathname } = useLocation()
  const background = useColorModeValue('white', shellDark.background)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  const active = useColorModeValue('#093A58', '#7BC9F1')
  const idle = useColorModeValue('#718096', shellDark.muted)
  const dotRing = useColorModeValue('white', shellDark.background)

  return (
    <Box
      aria-label="Navegação principal"
      as="nav"
      bg={background}
      borderColor={border}
      borderTopWidth="1px"
      bottom={0}
      css={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="app-tab-bar"
      display="grid"
      gridTemplateColumns="repeat(5, 1fr)"
      left={0}
      position="fixed"
      right={0}
      zIndex={30}
    >
      {TABS.map((tab) => {
        const selected = isTabActive(pathname, tab.href)
        return (
          <Box
            alignItems="center"
            asChild
            color={selected ? active : idle}
            display="flex"
            flexDirection="column"
            fontSize="11px"
            fontWeight={selected ? 'semibold' : 'medium'}
            gap="3px"
            h={TAB_BAR_HEIGHT}
            justifyContent="center"
            key={tab.href}
            minH="44px"
            position="relative"
          >
            <NavLink
              data-active={selected ? 'true' : 'false'}
              to={tab.href}
            >
            <Icon
              as={tab.icon}
              boxSize="24px"
            />
            {'dot' in tab && tab.dot ? (
              <Box
                bg="#C2410C"
                borderColor={dotRing}
                borderWidth="2px"
                boxSize="8px"
                data-testid="tab-dot-redes-sociais"
                position="absolute"
                right="calc(50% - 22px)"
                rounded="full"
                top="7px"
              />
            ) : null}
            <Text
              fontSize="11px"
              fontWeight={selected ? 'semibold' : 'medium'}
              lineHeight="1"
            >
              {tab.label}
            </Text>
            </NavLink>
          </Box>
        )
      })}
    </Box>
  )
}
