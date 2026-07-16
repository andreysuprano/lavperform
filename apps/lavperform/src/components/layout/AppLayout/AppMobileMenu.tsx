import {
  Box,
  Button,
  Circle,
  Drawer,
  HStack,
  Icon,
  type SelectValueChangeDetails,
  Separator,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useState } from 'react'
import { LuLogOut } from 'react-icons/lu'
import { RiMenuFoldLine, RiMenuUnfoldLine } from 'react-icons/ri'
import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'

import {
  ConnectWhatsAppButton,
  DisconnectWhatsAppButton,
  OrganizationSelect,
  ThemeImage,
} from '@/components'
import { useWhiteLabel } from '@/config'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'
import type { UserCompany } from '@/types'
import { MENU_ITEMS, MOBILE_ONLY_ITEMS } from '@/utils/constants/appMenuLinks'
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

const WhatsAppButtonMobile = memo(({ companyId }: { companyId: string }) => {
  const { isConnected } = useWhatsAppManager(companyId)

  if (isConnected) {
    return <DisconnectWhatsAppButton />
  }

  return <ConnectWhatsAppButton />
})

const MobileMenu = memo(
  ({
    isOpen,
    onClose,
    companies,
    selectedCompany,
    onCompanyChange,
    onLogout,
    menuItems,
  }: {
    isOpen: boolean
    onClose: () => void
    companies: UserCompany[]
    selectedCompany: UserCompany | null
    onCompanyChange: (details: SelectValueChangeDetails<UserCompany>) => void
    onLogout: () => void
    menuItems: typeof MENU_ITEMS
  }) => {
    const { colors } = useWhiteLabel()

    const location = useLocation()
    const activeHref = getActiveHref(menuItems, location.pathname)
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null)

    const handleMenuToggle = useCallback(
      (href: string, hasLinks: boolean) => {
        if (!hasLinks) {
          onClose()
        } else {
          setExpandedMenu((prev) => (prev === href ? null : href))
        }
      },
      [onClose]
    )

    return (
      <Drawer.Root
        onOpenChange={(e) => !e.open && onClose()}
        open={isOpen}
        placement="end"
        size="xs"
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>
                <Link to="/">
                  <ThemeImage
                    h="6"
                    imageKey="logo"
                    variant="auto"
                  />
                </Link>
              </Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body p={0}>
              <VStack
                gap={4}
                p={4}
              >
                <OrganizationSelect
                  companies={companies}
                  key={companies.map((c) => c.avatarUrl).join(',')}
                  onCompanyChange={onCompanyChange}
                  selectedCompany={selectedCompany}
                  showLabel
                />
                <WhatsAppButtonMobile companyId={selectedCompany?.id ?? ''} />
                <Separator />
                <Stack
                  gap={1}
                  w="full"
                >
                  {menuItems.map(({ label, icon, href, links }) => (
                    <Box
                      key={href}
                      w="full"
                    >
                      <HStack
                        _hover={{
                          bg: colors.primary,
                          textDecor: 'none',
                        }}
                        bg={
                          activeHref === href
                            ? colors.primary
                            : 'transparent'
                        }
                        borderRadius={'lg'}
                        borderWidth={1}
                        w={'full'}
                      >
                        <NavLink
                          onClick={() => handleMenuToggle(href, !!links)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            height: '2.5rem',
                            padding: '0 0.5rem',
                            width: '100%',
                            textDecoration: 'none',
                          }}
                          to={links ? '#' : href}
                        >
                          <Circle
                            boxSize={10}
                            size={6}
                          >
                            <Icon as={icon} />
                          </Circle>
                          <Text
                            color="fg"
                            flex={1}
                            fontSize={'sm'}
                            fontWeight={'medium'}
                          >
                            {label}
                          </Text>
                          {links && (
                            <Icon
                              as={
                                expandedMenu === href
                                  ? RiMenuUnfoldLine
                                  : RiMenuFoldLine
                              }
                              fontSize={'sm'}
                            />
                          )}
                        </NavLink>
                      </HStack>
                      {links && expandedMenu === href && (
                        <VStack
                          gap={1}
                          mt={1}
                          pl={6}
                          w="full"
                        >
                          {(() => {
                            const activeSublink = getLongestPrefixLinkMatch(
                              links,
                              location.pathname
                            )
                            return links.map((link) => (
                              <HStack
                                _hover={{
                                  bg: colors.primary,
                                  textDecor: 'none',
                                }}
                                alignItems="center"
                                bg={
                                  activeSublink?.href === link.href
                                    ? colors.primary
                                    : 'transparent'
                                }
                                borderRadius={'lg'}
                                borderWidth={1}
                                key={link.href}
                                px={2}
                                py={1}
                                w={'full'}
                              >
                                <NavLink
                                  onClick={onClose}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    height: '2.5rem',
                                    flex: 1,
                                    textDecoration: 'none',
                                  }}
                                  to={link.href}
                                >
                                  <Circle
                                    boxSize={8}
                                    size={5}
                                  >
                                    <Icon as={link.icon} />
                                  </Circle>
                                  <Text
                                    color="fg"
                                    fontSize={'sm'}
                                    fontWeight={'normal'}
                                  >
                                    {link.label}
                                  </Text>
                                </NavLink>
                              </HStack>
                            ))
                          })()}
                        </VStack>
                      )}
                    </Box>
                  ))}
                  {MOBILE_ONLY_ITEMS.map(({ label, icon, href }) => (
                    <HStack
                      _hover={{
                        bg: colors.primary,
                        textDecor: 'none',
                      }}
                      bg={
                        location.pathname.startsWith(href)
                          ? colors.primary
                          : 'transparent'
                      }
                      borderRadius={'lg'}
                      borderWidth={1}
                      key={href}
                      w={'full'}
                    >
                      <NavLink
                        onClick={onClose}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          height: '2.5rem',
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
                        <Text
                          color="fg"
                          flex={1}
                          fontSize={'sm'}
                          fontWeight={'medium'}
                        >
                          {label}
                        </Text>
                      </NavLink>
                    </HStack>
                  ))}
                </Stack>
                <Separator />
                <Button
                  onClick={onLogout}
                  variant="subtle"
                  w="full"
                >
                  <LuLogOut />
                  Sair
                </Button>
              </VStack>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    )
  }
)

MobileMenu.displayName = 'MobileMenu'

export { MobileMenu }
