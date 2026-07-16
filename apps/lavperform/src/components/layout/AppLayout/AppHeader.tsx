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
import { Link, NavLink } from 'react-router-dom'

import {
  ChannelDropdown,
  ColorModeButton,
  OrganizationSelect,
  ThemeImage,
} from '@/components'
import { CreditsHeaderCard } from '@/components/features/credits/CreditsHeaderCard/CreditsHeaderCard'
import { WeatherStatus } from '@/whitelabel/components/weather/WeatherStatus'
import type { UserCompany } from '@/types'

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
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    user: any
    companies: UserCompany[]
    selectedCompany: UserCompany | null
    onLogout: () => void
    onCompanyChange: (details: SelectValueChangeDetails<UserCompany>) => void
    onMobileMenuOpen: () => void
  }) => {
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
        h={16}
        justifyContent={'space-between'}
        position={'sticky'}
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
          <Link to="/">
            <ThemeImage
              display={{ base: 'block', lg: 'none' }}
              h="8"
              imageKey="logo"
              variant="auto"
            />
          </Link>
          <IconButton
            aria-label="Abrir menu"
            display={{ base: 'flex', lg: 'none' }}
            onClick={onMobileMenuOpen}
            size={'sm'}
            variant="outline"
          >
            <RiMenuLine />
          </IconButton>
          {/* Botão de toggle sidebar desktop */}
          <IconButton
            aria-label={open ? 'Esconder menu' : 'Mostrar menu'}
            display={{ base: 'none', lg: 'flex' }}
            onClick={handleToggleSidebar}
            size={'sm'}
            variant="outline"
          >
            {open ? <RiMenuFoldLine /> : <RiMenuUnfoldLine />}
          </IconButton>
          <Box display={{ base: 'none', lg: 'block' }}>
            <OrganizationSelect
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
                display={{ base: 'none', lg: 'flex' }}
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
                display={{ base: 'none', lg: 'flex' }}
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
          <ColorModeButton />
        </Center>
      </Center>
    )
  }
)

Header.displayName = 'Header'

export { Header }
