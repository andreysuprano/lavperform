import { Box, Flex, Grid, GridItem } from '@chakra-ui/react'
import { memo, useCallback, useState } from 'react'

import {
  LoadingState,
  Toaster,
  WhatsAppDisconnectedAlert,
} from '@/components'
import { useColorModeValue } from '@/components/ui/color-mode'
import { useAuth } from '@/context/AuthContext'
import { useCompanyChange } from '@/hooks/useCompanyChange'

import { Header } from './AppHeader'
import { AppIconSidebar } from './AppIconSidebar'
import { Props } from './AppLayout.types'
import { AppPhoneHeader } from './AppPhoneHeader'
import { Sidebar } from './AppSidebar'
import { AppTabBar } from './AppTabBar'
import { TAB_BAR_OFFSET } from './shellMode'
import { shellDark } from './shellPalette'
import { useAppMenuItems } from './useAppMenuItems'
import { useShellMode } from './useShellMode'

function AppLayoutBase({ children }: Props) {
  const {
    user,
    signOut,
    companies,
    selectedCompany,
    selectCompany,
    isPreloadLoading,
  } = useAuth()
  const mode = useShellMode()
  const shellBackground = useColorModeValue('bg.subtle', shellDark.background)
  const [open, setOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebar-open')
    return savedState !== null ? JSON.parse(savedState) : true
  })
  const [overlay, setOverlay] = useState(false)
  useCompanyChange()
  const menuItems = useAppMenuItems()

  const handleLogout = useCallback(() => {
    signOut()
  }, [signOut])

  const handleCompanyChange = useCallback(
    (details: { value: string[] }) => {
      if (details.value.length > 0) {
        selectCompany(details.value[0])
      }
    },
    [selectCompany]
  )

  if (isPreloadLoading) {
    return <LoadingState title="Carregando..." />
  }

  const content = (
    <>
      <Toaster />
      <WhatsAppDisconnectedAlert />
      <Flex
        bg={mode === 'desktop' ? 'bg.subtle' : shellBackground}
        minH={mode === 'phone' ? undefined : 'calc(100vh - 64px)'}
        minW={0}
        position="relative"
      >
        <Box
          as="div"
          bg={mode === 'desktop' ? 'bg.subtle' : shellBackground}
          flex={1}
          id="app-scroll-container"
          maxW="100%"
          minW={0}
          overflowX="hidden"
          overflowY="auto"
          p={{ base: 4, md: 6 }}
          pb={
            mode === 'phone'
              ? `calc(${TAB_BAR_OFFSET} + 16px)`
              : undefined
          }
          w="full"
        >
          {children}
        </Box>
      </Flex>
    </>
  )

  if (mode === 'phone') {
    return (
      <Flex
        bg={shellBackground}
        direction="column"
        h="100dvh"
        maxW="100vw"
        overflow="hidden"
      >
        <AppPhoneHeader />
        <Box
          flex="1"
          minH={0}
          minW={0}
          overflowX="hidden"
          overflowY="auto"
        >
          {content}
        </Box>
        <AppTabBar />
      </Flex>
    )
  }

  if (mode === 'tablet') {
    return (
      <Box
        bg={shellBackground}
        maxW="100vw"
        minH="100dvh"
        overflowX="hidden"
      >
        <AppIconSidebar menuItems={menuItems} />
        {overlay ? (
          <>
            <Box
              bg="blackAlpha.600"
              inset={0}
              onClick={() => setOverlay(false)}
              position="fixed"
              zIndex={20}
            />
            <Box
              bottom={0}
              data-testid="sidebar-overlay"
              left={0}
              position="fixed"
              top={0}
              w="260px"
              zIndex={21}
            >
              <Sidebar
                menuItems={menuItems}
                open
              />
            </Box>
          </>
        ) : null}
        <Box
          minW={0}
          ml="72px"
        >
          <Header
            companies={companies}
            onCompanyChange={handleCompanyChange}
            onLogout={handleLogout}
            onMobileMenuOpen={() => setOverlay(true)}
            open={open}
            selectedCompany={selectedCompany}
            setOpen={setOpen}
            user={user}
            variant="tablet"
          />
          {content}
        </Box>
      </Box>
    )
  }

  const gridTemplateColumns = open
    ? '260px calc(100% - 260px)'
    : '64px calc(100% - 64px)'

  return (
    <Grid
      templateColumns={gridTemplateColumns}
      transition="grid-template-columns 0.3s ease"
    >
      <GridItem>
        <Sidebar
          menuItems={menuItems}
          open={open}
        />
      </GridItem>
      <GridItem minW={0}>
        <Header
          companies={companies}
          onCompanyChange={handleCompanyChange}
          onLogout={handleLogout}
          onMobileMenuOpen={() => undefined}
          open={open}
          selectedCompany={selectedCompany}
          setOpen={setOpen}
          user={user}
          variant="desktop"
        />
        {content}
      </GridItem>
    </Grid>
  )
}

const AppLayout = memo(AppLayoutBase) as typeof AppLayoutBase

export { AppLayout, type Props as AppLayoutProps }
