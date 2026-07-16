import {
  Badge,
  Box,
  Button,
  Center,
  Circle,
  HStack,
  Icon,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'

import { ThemeImage, Tooltip } from '@/components'
import { useWhiteLabel } from '@/config'
import { ACADEMY_MENU_ITEM, MENU_ITEMS } from '@/utils/constants/appMenuLinks'
import { getLongestPrefixLinkMatch } from '@/utils/menuActiveMatch'

type MenuItemLike = { href: string; links?: { href: string }[] }

function getMenuItemMatchScore(item: MenuItemLike, pathname: string) {
  const linkMatch = getLongestPrefixLinkMatch(item.links, pathname)
  if (linkMatch) return 10000 + linkMatch.href.length
  if (pathname.startsWith(item.href)) return item.href.length
  return -1
}

function getActiveHref(items: MenuItemLike[], pathname: string) {
  let bestHref: string | null = null
  let bestScore = -1

  for (const item of items) {
    const score = getMenuItemMatchScore(item, pathname)
    if (score > bestScore) {
      bestScore = score
      bestHref = item.href
    }
  }

  return bestHref
}

// Componente de Sidebar separado e memoizado
const Sidebar = memo(
  ({ open, menuItems }: { open: boolean; menuItems: typeof MENU_ITEMS }) => {
    const { colors, colorPalette } = useWhiteLabel()

    const location = useLocation()
    const activeHref = getActiveHref(menuItems, location.pathname)

    return (
      <Box
        bg="bg"
        borderRightWidth={1}
        height="100vh"
        left="0"
        overflowX="hidden"
        overflowY="auto"
        position="fixed"
        top="0"
        transition="width 0.3s ease"
        w={open ? 260 : 16}
        whiteSpace={'nowrap'}
      >
        <Center
          bg="bg"
          borderBottomWidth={1}
          h={16}
          position={'sticky'}
          top={0}
        >
          <Link to="/">
            <ThemeImage
              h="8"
              imageKey={open ? 'logo' : 'logoIcon'}
              variant="auto"
            />
          </Link>
        </Center>
        <Stack
          flexDirection={'column'}
          gap={4}
          justifyContent={'space-between'}
          px={2}
          py={4}
        >
          <Stack gap={1}>
            {menuItems.map(({ label, icon, href, isNew, links }) => (
              <HStack
                _hover={{
                  layerStyle: 'fill.subtle',
                  bg: colors.primary,
                  textDecor: 'none',
                  color: { base: 'fg.primary', _dark: 'gray.900' },
                }}
                bg={
                  activeHref === href
                    ? colors.primary
                    : 'transparent'
                }
                borderRadius={'lg'}
                color={
                  activeHref === href ? 'gray.900' : 'inherit'
                }
                justifyContent={open ? 'flex-start' : 'center'}
                key={href}
                w={'full'}
              >
                <Tooltip
                  content={label}
                  disabled={open}
                  positioning={{ placement: 'right' }}
                >
                  <NavLink
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      height: '2.5rem',
                      justifyContent: open ? 'flex-start' : 'center',
                      padding: '0 0.5rem',
                      width: '100%',
                      textDecoration: 'none',
                    }}
                    to={href}
                  >
                    <Circle
                      boxSize={10}
                      size={6}
                    >
                      <Icon as={icon} />
                    </Circle>
                    {open && (
                      <>
                        <Text
                          fontSize={'sm'}
                          fontWeight={'medium'}
                        >
                          {label}
                        </Text>
                        {isNew && (
                          <Badge
                            colorPalette={'orange'}
                            variant={'solid'}
                          >
                            Novidade
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                </Tooltip>
              </HStack>
            ))}
            {}
          </Stack>
          {ACADEMY_MENU_ITEM && (
            <>
              <Separator />
              <Link to={ACADEMY_MENU_ITEM.href}>
                <Button
                  borderColor={{
                    base: `${colorPalette}.600`,
                    _dark: `${colorPalette}.200`,
                  }}
                  color={{
                    base: `${colorPalette}.800`,
                    _dark: `${colorPalette}.300`,
                  }}
                  colorPalette={colorPalette}
                  size="xl"
                  variant="outline"
                  w="full"
                >
                  <Icon as={ACADEMY_MENU_ITEM.icon} />
                  {open && ACADEMY_MENU_ITEM.label}
                </Button>
              </Link>
            </>
          )}
          {/* 
          // Removed Promotion Card 
          {open && (
            <>
              <Separator />
              <PromotionCard
                href="https://foodcrm.com.br"
                image={FundoLogin}
                title="Conheça nossa nova integração com o iFood. Clique para saber mais!"
              />
            </>
          )} */}
        </Stack>
      </Box>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export { Sidebar }
