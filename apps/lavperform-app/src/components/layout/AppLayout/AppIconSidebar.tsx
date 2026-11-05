import { Box, Icon, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import { type ElementType, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { ThemeImage } from '@/components'
import { useColorModeValue } from '@/components/ui/color-mode'
import { ACADEMY_MENU_ITEM } from '@/utils/constants/appMenuLinks'
import { getLongestPrefixLinkMatch } from '@/utils/menuActiveMatch'

import { ShellNavLink } from './ShellLink'
import { shellDark } from './shellPalette'

type MenuLink = {
  label: string
  href: string
  badge?: string
}

type MenuItemLike = {
  label: string
  href: string
  icon: ElementType
  isNew?: boolean
  links?: MenuLink[]
}

export function AppIconSidebar({ menuItems }: { menuItems: MenuItemLike[] }) {
  const location = useLocation()
  const [openHref, setOpenHref] = useState<string | null>(null)
  const surface = useColorModeValue('white', shellDark.background)
  const line = useColorModeValue('#E4E4E7', shellDark.border)
  const idle = useColorModeValue('gray.500', shellDark.muted)
  const popoverBg = useColorModeValue('white', shellDark.card)
  const rowHover = useColorModeValue('gray.50', 'whiteAlpha.100')
  const subActive = useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)')

  return (
    <Box
      bg={surface}
      borderColor={line}
      borderRightWidth="1px"
      bottom={0}
      data-testid="app-icon-sidebar"
      display="flex"
      flexDirection="column"
      left={0}
      position="fixed"
      pt="env(safe-area-inset-top, 0px)"
      top={0}
      w="72px"
      zIndex={12}
    >
      <Box
        alignItems="center"
        display="flex"
        h="64px"
        justifyContent="center"
      >
        <ThemeImage
          h="8"
          imageKey="logoIcon"
          variant="auto"
        />
      </Box>
      <Stack
        align="center"
        flex="1"
        gap="4px"
        overflowY="auto"
        pb="12px"
        px="8px"
      >
        {menuItems.map((item) => {
          const active =
            location.pathname === item.href ||
            location.pathname.startsWith(`${item.href}/`) ||
            Boolean(getLongestPrefixLinkMatch(item.links, location.pathname))
          const iconButton = (
            <Box
              alignItems="center"
              aria-label={item.label}
              bg={active ? '#7BC9F1' : 'transparent'}
              borderRadius="10px"
              color={active ? '#18181B' : idle}
              display="flex"
              h="44px"
              justifyContent="center"
              w="44px"
            >
              <Icon
                as={item.icon}
                boxSize="22px"
              />
            </Box>
          )

          if (!item.links?.length) {
            return (
              <ShellNavLink
                key={item.href}
                textDecoration="none"
                to={item.href}
              >
                {iconButton}
              </ShellNavLink>
            )
          }

          return (
            <Popover.Root
              key={item.href}
              onOpenChange={(details) =>
                setOpenHref(details.open ? item.href : null)
              }
              open={openHref === item.href}
              positioning={{ placement: 'right-start', gutter: 8 }}
            >
              <Popover.Trigger asChild>
                <button
                  aria-label={item.label}
                  type="button"
                >
                  {iconButton}
                </button>
              </Popover.Trigger>
              <Portal>
                <Popover.Positioner>
                  <Popover.Content
                    bg={popoverBg}
                    borderColor={line}
                    borderRadius="12px"
                    borderWidth="1px"
                    minW="220px"
                    p={2}
                    shadow="lg"
                  >
                    <Box
                      alignItems="center"
                      display="flex"
                      gap={2}
                      px={2}
                      py={2}
                    >
                      <Text
                        fontSize="14px"
                        fontWeight="semibold"
                      >
                        {item.label}
                      </Text>
                      {item.isNew ? (
                        <Box
                          bg="#C2410C"
                          borderRadius="4px"
                          color="white"
                          fontSize="10px"
                          fontWeight="semibold"
                          px="6px"
                          py="2px"
                        >
                          Novidade
                        </Box>
                      ) : null}
                    </Box>
                    {item.links.map((link) => {
                      const selected =
                        getLongestPrefixLinkMatch(item.links, location.pathname)
                          ?.href === link.href
                      return (
                        <ShellNavLink
                          _hover={{ bg: rowHover }}
                          alignItems="center"
                          bg={selected ? subActive : 'transparent'}
                          borderRadius="8px"
                          display="flex"
                          fontSize="14px"
                          h="44px"
                          key={link.href}
                          onClick={() => setOpenHref(null)}
                          px={3}
                          textDecoration="none"
                          to={link.href}
                        >
                          {link.label}
                          {link.badge ? (
                            <Box
                              bg="#C2410C"
                              borderRadius="4px"
                              color="white"
                              fontSize="10px"
                              fontWeight="semibold"
                              ml={2}
                              px="6px"
                              py="2px"
                            >
                              {link.badge}
                            </Box>
                          ) : null}
                        </ShellNavLink>
                      )
                    })}
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          )
        })}
      </Stack>
      <ShellNavLink
        display="flex"
        justifyContent="center"
        mb={3}
        textDecoration="none"
        to={ACADEMY_MENU_ITEM.href}
      >
        <Box
          alignItems="center"
          aria-label={ACADEMY_MENU_ITEM.label}
          borderColor={line}
          borderRadius="10px"
          borderWidth="1px"
          color={idle}
          display="flex"
          h="44px"
          justifyContent="center"
          w="44px"
        >
          <Icon
            as={ACADEMY_MENU_ITEM.icon}
            boxSize="20px"
          />
        </Box>
      </ShellNavLink>
    </Box>
  )
}
