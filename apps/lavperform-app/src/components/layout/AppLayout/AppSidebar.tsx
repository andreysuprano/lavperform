import { Badge, Box, Button, Center, Icon, Stack, Text } from '@chakra-ui/react'
import { type ElementType,memo } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { ThemeImage, Tooltip } from '@/components'
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

    return (
      <Box
        bg="white"
        borderColor="#E4E4E7"
        borderRightWidth="1px"
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
          bg="white"
          borderBottomColor="#E4E4E7"
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
                      css={
                        isActive
                          ? undefined
                          : {
                              '&:hover': {
                                backgroundColor: '#F4F4F5 !important',
                              },
                            }
                      }
                      _hover={
                        isActive
                          ? undefined
                          : { bg: 'gray.100', textDecoration: 'none' }
                      }
                      alignItems="center"
                      as={NavLink}
                      bg={isActive ? '#7BC9F1' : 'transparent'}
                      borderRadius="8px"
                      color={isActive ? '#18181B' : '#3F3F46'}
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
                          css={{
                            '&:hover': {
                              backgroundColor: '#F4F4F5 !important',
                            },
                          }}
                          _hover={{ bg: 'gray.100', textDecoration: 'none' }}
                          alignItems="center"
                          as={NavLink}
                          bg={subActive ? '#E8F6FD' : 'transparent'}
                          borderRadius="8px"
                          color={subActive ? '#093A58' : '#52525B'}
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
                bg="white"
                borderColor="#D4D4D8"
                color="#27272A"
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
