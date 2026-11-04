import { Badge, Box, Button, Center, Icon, Stack, Text } from '@chakra-ui/react'
import { type ElementType, memo } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { ThemeImage, Tooltip } from '@/components'
import { useColorModeValue } from '@/components/ui/color-mode'
import { ACADEMY_MENU_ITEM } from '@/utils/constants/appMenuLinks'
import { getLongestPrefixLinkMatch } from '@/utils/menuActiveMatch'

type MenuLink = {
  label: string
  href: string
  icon?: ElementType
  badge?: string
  badgeColorPalette?: string
}

type MenuItemLike = {
  label: string
  href: string
  icon: ElementType
  isNew?: boolean
  links?: MenuLink[]
}

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

const Sidebar = memo(
  ({ open, menuItems }: { open: boolean; menuItems: MenuItemLike[] }) => {
    const location = useLocation()
    const activeHref = getActiveHref(menuItems, location.pathname)
    const surface = useColorModeValue('white', 'gray.900')
    const line = useColorModeValue('gray.200', 'whiteAlpha.100')
    const idleText = useColorModeValue('#3F3F46', 'gray.300')
    const idleIcon = useColorModeValue('gray.500', 'gray.400')
    const hoverBg = useColorModeValue('gray.100', 'whiteAlpha.100')
    const hoverPaint = useColorModeValue('#F4F4F5', 'rgba(255, 255, 255, 0.1)')
    const subActiveBg = useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)')
    const subActiveText = useColorModeValue('#093A58', '#7BC9F1')
    const academyText = useColorModeValue('#27272A', 'gray.400')
    const academyLine = useColorModeValue('#D4D4D8', 'whiteAlpha.100')

    return (
      <Box
        bg={surface}
        borderColor={line}
        borderRightWidth="1px"
        data-sidebar-bg={surface}
        data-sidebar-hover={hoverBg}
        data-sidebar-sub={subActiveBg}
        data-testid="app-sidebar"
        height="100vh"
        left="0"
        overflowX="hidden"
        overflowY="auto"
        position="fixed"
        top="0"
        transition="width 0.3s ease"
        w={open ? '260px' : '64px'}
      >
        <Center
          bg={surface}
          borderBottomColor={line}
          borderBottomWidth="1px"
          h="64px"
          position="sticky"
          top={0}
          zIndex={1}
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
          gap={1}
          h="calc(100vh - 64px)"
          justify="space-between"
          px="8px"
          py="16px"
        >
          <Stack gap="4px">
            {menuItems.map((item) => {
              const isActive = activeHref === item.href
              const activeLink = isActive
                ? getLongestPrefixLinkMatch(item.links, location.pathname)
                : undefined

              return (
                <Box key={item.href}>
                  <Tooltip
                    content={item.label}
                    disabled={open}
                    positioning={{ placement: 'right' }}
                  >
                    <Box
                      _hover={
                        isActive
                          ? undefined
                          : { bg: hoverBg, textDecoration: 'none' }
                      }
                      alignItems="center"
                      as={NavLink}
                      bg={isActive ? '#7BC9F1' : 'transparent'}
                      borderRadius="8px"
                      color={isActive ? '#18181B' : idleText}
                      css={
                        isActive
                          ? undefined
                          : {
                              '&:hover': {
                                backgroundColor: `${hoverPaint} !important`,
                              },
                            }
                      }
                      display="flex"
                      fontSize="14px"
                      fontWeight="medium"
                      gap="8px"
                      h="40px"
                      justifyContent={open ? 'flex-start' : 'center'}
                      px="12px"
                      textDecoration="none"
                      to={item.href}
                      w="full"
                    >
                      <Icon
                        as={item.icon}
                        boxSize="18px"
                        color={isActive ? '#18181B' : idleIcon}
                      />
                      {open && (
                        <Text
                          flex="1"
                          fontSize="14px"
                          fontWeight="medium"
                          truncate
                        >
                          {item.label}
                        </Text>
                      )}
                      {open && item.isNew && (
                        <Badge
                          bg="#EA580C"
                          borderRadius="4px"
                          color="white"
                          data-testid={`nav-badge-${item.href}`}
                          fontSize="11px"
                          fontWeight="semibold"
                          px="6px"
                          py="2px"
                        >
                          Novidade
                        </Badge>
                      )}
                    </Box>
                  </Tooltip>
                  {open &&
                    isActive &&
                    item.links?.map((link) => {
                      const subActive = activeLink?.href === link.href
                      return (
                        <Box
                          _hover={
                            subActive
                              ? undefined
                              : { bg: hoverBg, textDecoration: 'none' }
                          }
                          alignItems="center"
                          as={NavLink}
                          bg={subActive ? subActiveBg : 'transparent'}
                          borderRadius="8px"
                          color={subActive ? subActiveText : idleText}
                          css={
                            subActive
                              ? undefined
                              : {
                                  '&:hover': {
                                    backgroundColor: `${hoverPaint} !important`,
                                  },
                                }
                          }
                          display="flex"
                          fontSize="13px"
                          fontWeight={subActive ? 'semibold' : 'normal'}
                          h="34px"
                          key={link.href}
                          pl="44px"
                          pr="12px"
                          textDecoration="none"
                          to={link.href}
                        >
                          <Text
                            flex="1"
                            fontSize="13px"
                            fontWeight={subActive ? 'semibold' : 'normal'}
                            truncate
                          >
                            {link.label}
                          </Text>
                          {link.badge && (
                            <Badge
                              bg="#EA580C"
                              borderRadius="4px"
                              color="white"
                              fontSize="10px"
                              fontWeight="semibold"
                              px="6px"
                              py="2px"
                            >
                              {link.badge}
                            </Badge>
                          )}
                        </Box>
                      )
                    })}
                </Box>
              )
            })}
          </Stack>
          {ACADEMY_MENU_ITEM && (
            <Link to={ACADEMY_MENU_ITEM.href}>
              <Button
                bg={surface}
                borderColor={academyLine}
                borderTopWidth="1px"
                color={academyText}
                fontWeight="semibold"
                h="40px"
                variant="outline"
                w="full"
              >
                <Icon
                  as={ACADEMY_MENU_ITEM.icon}
                  boxSize="16px"
                />
                {open && ACADEMY_MENU_ITEM.label}
              </Button>
            </Link>
          )}
        </Stack>
      </Box>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export { Sidebar }
