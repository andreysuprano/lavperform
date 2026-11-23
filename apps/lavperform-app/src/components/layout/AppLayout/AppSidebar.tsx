import { Box, Center, Icon, Stack, Text } from '@chakra-ui/react'
import { type ElementType, memo } from 'react'
import { LuChevronRight } from 'react-icons/lu'
import { Link, useLocation } from 'react-router-dom'

import { ThemeImage, Tooltip } from '@/components'
import { useColorModeValue } from '@/components/ui/color-mode'
import { ACADEMY_MENU_ITEM } from '@/utils/constants/appMenuLinks'
import { getLongestPrefixLinkMatch } from '@/utils/menuActiveMatch'

import { NavNewBadge } from './NavNewBadge'
import { ShellNavLink } from './ShellLink'

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
    const strongText = useColorModeValue('#18181B', 'white')
    const chevron = useColorModeValue('gray.400', 'gray.500')
    const hoverBg = useColorModeValue('gray.100', 'whiteAlpha.100')
    const hoverPaint = useColorModeValue('#F4F4F5', 'rgba(255, 255, 255, 0.1)')
    const subActiveBg = useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)')

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
              const hasLinks = Boolean(item.links?.length)
              const activeLink = isActive
                ? getLongestPrefixLinkMatch(item.links, location.pathname)
                : undefined
              // Com subitem aberto, quem destaca a página atual é o subitem.
              // O grupo só ganha ênfase de texto, sem um segundo bloco azul.
              const isParentOfCurrent = isActive && Boolean(activeLink)
              const isCurrent = isActive && !isParentOfCurrent
              const expanded = open && isParentOfCurrent

              return (
                <Box key={item.href}>
                  <Tooltip
                    content={item.label}
                    disabled={open}
                    positioning={{ placement: 'right' }}
                  >
                    <ShellNavLink
                      _hover={
                        isCurrent
                          ? undefined
                          : { bg: hoverBg, textDecoration: 'none' }
                      }
                      alignItems="center"
                      bg={isCurrent ? '#7BC9F1' : 'transparent'}
                      borderRadius="8px"
                      color={
                        isCurrent
                          ? '#18181B'
                          : isParentOfCurrent
                            ? strongText
                            : idleText
                      }
                      css={
                        isCurrent
                          ? undefined
                          : {
                              '&:hover': {
                                backgroundColor: `${hoverPaint} !important`,
                              },
                            }
                      }
                      display="flex"
                      fontSize="14px"
                      fontWeight={isParentOfCurrent ? 'semibold' : 'medium'}
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
                        color={
                          isCurrent
                            ? '#18181B'
                            : isParentOfCurrent
                              ? strongText
                              : idleIcon
                        }
                      />
                      {open && (
                        <Text
                          flex="1"
                          fontSize="14px"
                          fontWeight="inherit"
                          truncate
                        >
                          {item.label}
                        </Text>
                      )}
                      {open && item.isNew && (
                        <NavNewBadge testId={`nav-badge-${item.href}`}>
                          Novidade
                        </NavNewBadge>
                      )}
                      {open && hasLinks && (
                        <Icon
                          as={LuChevronRight}
                          boxSize="14px"
                          color={isCurrent ? '#18181B' : chevron}
                          flexShrink={0}
                          style={{
                            transform: expanded
                              ? 'rotate(90deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease-out',
                          }}
                        />
                      )}
                    </ShellNavLink>
                  </Tooltip>
                  {expanded && (
                    <Stack
                      borderColor={line}
                      borderLeftWidth="1px"
                      gap="2px"
                      ml="21px"
                      my="4px"
                    >
                      {item.links?.map((link) => {
                        const subActive = activeLink?.href === link.href
                        return (
                          <ShellNavLink
                            _hover={
                              subActive
                                ? undefined
                                : { bg: hoverBg, textDecoration: 'none' }
                            }
                            alignItems="center"
                            bg={subActive ? '#7BC9F1' : 'transparent'}
                            borderRadius="8px"
                            color={subActive ? '#18181B' : idleText}
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
                            ml="-1px"
                            pl="16px"
                            pr="12px"
                            textDecoration="none"
                            to={link.href}
                          >
                            <Text
                              flex="1"
                              fontSize="13px"
                              fontWeight="inherit"
                              truncate
                            >
                              {link.label}
                            </Text>
                            {link.badge && (
                              <NavNewBadge
                                fontSize="10px"
                                testId={`nav-badge-${link.href}`}
                              >
                                {link.badge}
                              </NavNewBadge>
                            )}
                          </ShellNavLink>
                        )
                      })}
                    </Stack>
                  )}
                </Box>
              )
            })}
          </Stack>
          {ACADEMY_MENU_ITEM && (
            <Box
              borderColor={line}
              borderTopWidth="1px"
              pt="12px"
            >
              <Tooltip
                content={ACADEMY_MENU_ITEM.label}
                disabled={open}
                positioning={{ placement: 'right' }}
              >
                <ShellNavLink
                  _hover={{ bg: hoverBg, textDecoration: 'none' }}
                  alignItems="center"
                  borderRadius="8px"
                  color={idleText}
                  css={{
                    '&:hover': {
                      backgroundColor: `${hoverPaint} !important`,
                    },
                  }}
                  display="flex"
                  fontSize="14px"
                  fontWeight="medium"
                  gap="8px"
                  h="40px"
                  justifyContent={open ? 'flex-start' : 'center'}
                  px="12px"
                  textDecoration="none"
                  to={ACADEMY_MENU_ITEM.href}
                  w="full"
                >
                  <Icon
                    as={ACADEMY_MENU_ITEM.icon}
                    boxSize="18px"
                    color={idleIcon}
                  />
                  {open && ACADEMY_MENU_ITEM.label}
                </ShellNavLink>
              </Tooltip>
            </Box>
          )}
        </Stack>
      </Box>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export { Sidebar }
