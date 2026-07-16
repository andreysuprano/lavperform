import {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  type SelectValueChangeDetails,
  useDisclosure,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  LoadingState,
  Toaster,
  WhatsAppDisconnectedAlert,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCompanyChange } from '@/hooks/useCompanyChange'
import { useMetaIntegrationAvailability } from '@/hooks/queries'
import { useHasLandingPage, useWhitelabelActive } from '@/whitelabel/hooks'
import type { UserCompany } from '@/types'
import {
  ADMIN_MENU_ITEM,
  FOODCRM_MENU_ITEMS,
  MENU_ITEMS,
} from '@/utils/constants/appMenuLinks'
import { getLongestPrefixLinkMatch } from '@/utils/menuActiveMatch'
import { WHITELABEL_MENU_ITEMS } from '@/whitelabel/constants'

import { Header } from './AppHeader'
import { Props } from './AppLayout.types'
import { MobileMenu } from './AppMobileMenu'
import { Sidebar } from './AppSidebar'
import { AppSubMenu } from './AppSubMenu'

function applyMetaCreativesVisibility<
  T extends {
    href: string
    links?: Array<{ href: string; requiresMetaApi?: boolean }>
  },
>(items: T[], metaApiAvailable: boolean): T[] {
  return items.map((item) => {
    if (!item.links?.some((link) => link.requiresMetaApi)) return item

    const links = item.links.filter(
      (link) => !link.requiresMetaApi || metaApiAvailable
    )

    return { ...item, links }
  })
}

/** Oculta subpáginas de "Landing Page" no menu quando a empresa ainda não tem landing page criada. */
function applyLandingPageVisibility<T extends { href: string; links?: unknown }>(
  items: T[],
  hasLandingPage: boolean
): T[] {
  return items.map((item) => {
    if (item.href !== '/whitelabel/landing-page') return item
    if (!hasLandingPage) {
      const { links, ...rest } = item
      return { ...rest } as T
    }
    return item
  })
}

type MenuItemLike = { href: string; links?: { href: string }[] }

function getMenuItemMatchScore(item: MenuItemLike, pathname: string) {
  const linkMatch = getLongestPrefixLinkMatch(item.links, pathname)
  if (linkMatch) return 10000 + linkMatch.href.length
  if (pathname.startsWith(item.href)) return item.href.length
  return -1
}

function getActiveMenuItem(items: MenuItemLike[], pathname: string) {
  let best: MenuItemLike | undefined
  let bestScore = -1

  for (const item of items) {
    const score = getMenuItemMatchScore(item, pathname)
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  return best
}

function AppLayoutBase({ children }: Props) {
  const {
    user,
    signOut,
    companies,
    selectedCompany,
    selectCompany,
    isAdmin,
    isPreloadLoading,
  } = useAuth()

  const [open, setOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebar-open')
    return savedState !== null ? JSON.parse(savedState) : true
  })
  const {
    open: mobileMenuOpen,
    onOpen: onMobileMenuOpen,
    onClose: onMobileMenuClose,
  } = useDisclosure()
  const location = useLocation()

  useCompanyChange()
  const { isActive: isWhitelabelActive } = useWhitelabelActive()
  const { hasLandingPage } = useHasLandingPage()
  const { data: metaAvailability } = useMetaIntegrationAvailability(
    selectedCompany?.id
  )

  const menuItems = useMemo(() => {
    let items = [...MENU_ITEMS]
    const integrationsIndex = items.findIndex(
      (item) => item.href === '/integrations'
    )

    if (isWhitelabelActive) {
      const whitelabelItems = applyLandingPageVisibility(
        WHITELABEL_MENU_ITEMS,
        hasLandingPage
      )
      if (integrationsIndex !== -1) {
        items.splice(integrationsIndex, 0, ...whitelabelItems)
      } else {
        items.push(...whitelabelItems)
      }
    } else {
      if (integrationsIndex !== -1) {
        items.splice(integrationsIndex, 0, ...FOODCRM_MENU_ITEMS)
      } else {
        items.push(...FOODCRM_MENU_ITEMS)
      }
    }
    
    if (isAdmin) {
      items.push(...ADMIN_MENU_ITEM)
    }

    items = applyMetaCreativesVisibility(
      items,
      metaAvailability?.available === true
    )

    return items
  }, [hasLandingPage, isAdmin, isWhitelabelActive, metaAvailability?.available])

  const handleLogout = useCallback(() => {
    signOut()
  }, [signOut])

  const handleCompanyChange = useCallback(
    (details: SelectValueChangeDetails<UserCompany>) => {
      if (details.value.length > 0) {
        selectCompany(details.value[0])
      }
    },
    [selectCompany]
  )

  const currentMenuItem = useMemo(
    () => getActiveMenuItem(menuItems, location.pathname),
    [location.pathname, menuItems]
  )

  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-open')
    if (savedState !== null) {
      // Se o usuário já definiu uma preferência, respeita ela
      return
    }

    // Comportamento padrão apenas se não houver preferência salva
    if (currentMenuItem?.links) {
      setOpen(false)
      return
    }
    setOpen(true)
  }, [currentMenuItem])

  const gridTemplateColumns = useMemo(
    () => (open ? '260px calc(100% - 260px)' : '64px calc(100% - 64px)'),
    [open]
  )

  if (isPreloadLoading) {
    return <LoadingState title="Carregando..." />
  }

  return (
    <>
      <MobileMenu
        companies={companies}
        isOpen={mobileMenuOpen}
        menuItems={menuItems}
        onClose={onMobileMenuClose}
        onCompanyChange={handleCompanyChange}
        onLogout={handleLogout}
        selectedCompany={selectedCompany}
      />
      <Grid
        display={{ base: 'block', lg: 'grid' }}
        templateColumns={gridTemplateColumns}
        templateRows="repeat(2, 1fr)"
        transition="grid-template-columns 0.3s ease"
      >
        <GridItem
          colSpan={1}
          display={{ base: 'none', lg: 'block' }}
          rowSpan={2}
        >
          <Sidebar
            menuItems={menuItems}
            open={open}
          />
        </GridItem>
        <GridItem
          colSpan={{ base: 1, lg: 1 }}
          rowSpan={2}
        >
          <Header
            companies={companies}
            onCompanyChange={handleCompanyChange}
            onLogout={handleLogout}
            onMobileMenuOpen={onMobileMenuOpen}
            open={open}
            selectedCompany={selectedCompany}
            setOpen={setOpen}
            user={user}
          />
          <Toaster />
          <WhatsAppDisconnectedAlert />
          <Flex
            bg="bg.subtle"
            minH={'calc(100vh - 64px)'}
            position={'relative'}
          >
            {currentMenuItem && currentMenuItem.links && (
              <AppSubMenu
                currentMenuItem={currentMenuItem}
                location={location}
                open={open}
              />
            )}
            <Box
              as={Container}
              bg="bg.subtle"
              flex={1}
              id="app-scroll-container"
              overflow={'auto'}
              p={{ base: 4, md: 6 }}
            >
              {children}
            </Box>
          </Flex>
        </GridItem>
      </Grid>
    </>
  )
}

const AppLayout = memo(AppLayoutBase) as typeof AppLayoutBase

export { AppLayout, type Props as AppLayoutProps }
