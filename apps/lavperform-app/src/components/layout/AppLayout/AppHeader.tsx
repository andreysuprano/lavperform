import {
  Avatar,
  Box,
  Button,
  Center,
  EmptyState,
  IconButton,
  Menu,
  Portal,
  type SelectValueChangeDetails,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { LuBell, LuDollarSign, LuLogOut } from 'react-icons/lu'
import { PiEmpty } from 'react-icons/pi'
import {
  RiMenuFoldLine,
  RiMenuLine,
  RiMenuUnfoldLine,
  RiSettings4Line,
} from 'react-icons/ri'
import { NavLink } from 'react-router-dom'

import {
  ChannelDropdown,
  ColorModeButton,
  OrganizationSelect,
} from '@/components'
import { CreditsHeaderCard } from '@/components/features/credits/CreditsHeaderCard/CreditsHeaderCard'
import type { UserCompany } from '@/types'
import { WeatherStatus } from '@/whitelabel/components/weather/WeatherStatus'

const Header = memo(
  ({
    open,
    setOpen,
    user,
    companies,
    selectedCompany,
    onLogout,
    onCompanyChange,
    onMobileMenuOpen,
    variant = 'desktop',
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    user: any
    companies: UserCompany[]
    selectedCompany: UserCompany | null
    onLogout: () => void
    onCompanyChange: (details: SelectValueChangeDetails<UserCompany>) => void
    onMobileMenuOpen: () => void
    variant?: 'desktop' | 'tablet'
  }) => {
    const tablet = variant === 'tablet'
    const handleToggleSidebar = useCallback(() => {
      const newOpenState = !open
      setOpen(newOpenState)

      if (newOpenState) {
        // Remove do storage quando abrir, voltando ao comportamento padrão
        localStorage.removeItem('sidebar-open')
      } else {
        // Salva apenas quando fechar
        localStorage.setItem('sidebar-open', JSON.stringify(newOpenState))
      }
    }, [open, setOpen])

    const userName = useMemo(
      () => user?.userName?.split(' ')[0],
      [user?.userName]
    )

    return (
      <Center
        bg="bg"
        borderBottomWidth={1}
        gap={{ base: 2, lg: 4 }}
        h="calc(64px + env(safe-area-inset-top, 0px))"
        justifyContent={'space-between'}
        position={'sticky'}
        pt="env(safe-area-inset-top, 0px)"
        px={{ base: 4, md: 6 }}
        top="0"
        zIndex="11"
      >
        <Center
          flex={1}
          gap={2}
          justifyContent={{ base: 'space-between', lg: 'flex-start' }}
        >
          {/* Logo e Botão de menu mobile */}
          <IconButton
            aria-label="Abrir menu"
            className={tablet ? 'shell-touch-44' : undefined}
            display={tablet ? 'flex' : 'none'}
            minH={tablet ? '44px' : undefined}
            minW={tablet ? '44px' : undefined}
            onClick={onMobileMenuOpen}
            size={'sm'}
            variant="outline"
          >
            <RiMenuLine />
          </IconButton>
          <IconButton
            aria-label={open ? 'Esconder menu' : 'Mostrar menu'}
            display={tablet ? 'none' : 'flex'}
            onClick={handleToggleSidebar}
            size={'sm'}
            variant="outline"
          >
            {open ? <RiMenuFoldLine /> : <RiMenuUnfoldLine />}
          </IconButton>
          <Box maxW={tablet ? '72px' : '280px'}>
            <OrganizationSelect
              compact={tablet}
              companies={companies}
              key={companies.map((c) => c.avatarUrl).join(',')}
              onCompanyChange={onCompanyChange}
              selectedCompany={selectedCompany}
            />
          </Box>
        </Center>
        <Center gap={2}>
          <WeatherStatus />
          <CreditsHeaderCard />
          <ChannelDropdown />
          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton
                className={tablet ? 'shell-touch-44' : undefined}
                minH={tablet ? '44px' : undefined}
                minW={tablet ? '44px' : undefined}
                size={'sm'}
                variant="outline"
              >
                <LuBell />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  minH={200}
                  minW={200}
                >
                  <EmptyState.Root>
                    <EmptyState.Content>
                      <EmptyState.Indicator>
                        <PiEmpty />
                      </EmptyState.Indicator>
                      <VStack textAlign="center">
                        <EmptyState.Title>Nenhuma notificação</EmptyState.Title>
                        <EmptyState.Description>
                          Você não possui novas notificações no momento
                        </EmptyState.Description>
                      </VStack>
                    </EmptyState.Content>
                  </EmptyState.Root>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                className={tablet ? 'shell-touch-44' : undefined}
                minH={tablet ? '44px' : undefined}
                px={2}
                size={'sm'}
                variant="outline"
              >
                <Avatar.Root
                  key={user?.companyAvatar}
                  size="2xs"
                >
                  <Avatar.Fallback name={user?.userName} />
                  <Avatar.Image
                    alt={user?.userName}
                    rounded={'md'}
                    src={user?.companyAvatar}
                  />
                </Avatar.Root>
                <Text
                  display={{ base: 'none', sm: 'block' }}
                  fontSize={'sm'}
                  pr={1}
                >
                  {userName}
                </Text>
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    asChild
                    value="billing"
                  >
                    <NavLink to="/billing">
                      <LuDollarSign />
                      Financeiro
                    </NavLink>
                  </Menu.Item>
                  <Menu.Item
                    asChild
                    value="configurations"
                  >
                    <NavLink to="/settings">
                      <RiSettings4Line />
                      Ajustes
                    </NavLink>
                  </Menu.Item>
                  <Menu.Item
                    onSelect={onLogout}
                    value="logout"
                  >
                    <LuLogOut />
                    Sair
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
          <ColorModeButton
            className={tablet ? 'shell-touch-44' : undefined}
            minH={tablet ? '44px' : undefined}
            minW={tablet ? '44px' : undefined}
          />
        </Center>
      </Center>
    )
  }
)

Header.displayName = 'Header'

export { Header }
