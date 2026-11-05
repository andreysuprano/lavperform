import {
  Box,
  Button,
  Center,
  EmptyState,
  Icon,
  IconButton,
  Image,
  Menu,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import { LuBell, LuChevronDown, LuChevronLeft } from 'react-icons/lu'
import { PiEmpty } from 'react-icons/pi'
import { useLocation, useNavigate } from 'react-router-dom'

import { ColorModeButton } from '@/components/ui/color-mode'
import { useColorModeValue } from '@/components/ui/color-mode'
import { useAuth } from '@/context/AuthContext'

import { phoneShowsBack, phoneTitle } from './phoneTitle'
import { ShellLink } from './ShellLink'
import { initials } from './storeGroups'

export function AppPhoneHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const background = useColorModeValue('white', 'gray.900')
  const border = useColorModeValue('#E4E4E7', 'whiteAlpha.200')
  const text = useColorModeValue('#18181B', 'gray.100')
  const backColor = useColorModeValue('#093A58', '#7BC9F1')
  const switcher = pathname === '/trocar-loja'
  const title = phoneTitle(pathname)
  const showBack = phoneShowsBack(pathname)
  const name = selectedCompany?.name ?? 'Selecionar loja'

  return (
    <Box
      bg={background}
      borderBottomWidth="1px"
      borderColor={border}
      data-testid="app-phone-header"
      position="sticky"
      pt="env(safe-area-inset-top, 0px)"
      top={0}
      zIndex={20}
    >
      <Box
        alignItems="center"
        display="flex"
        h="52px"
        justifyContent="space-between"
        pl={switcher ? 4 : 3}
        pr={1}
      >
        {switcher ? (
          <Button
            alignItems="center"
            color="#093A58"
            css={{ _dark: { color: '#7BC9F1' } }}
            display="flex"
            fontSize="16px"
            fontWeight="medium"
            gap="2px"
            h="44px"
            minW="44px"
            onClick={() => navigate(-1)}
            type="button"
            variant="ghost"
          >
            <LuChevronLeft size={22} />
            Voltar
          </Button>
        ) : (
          <ShellLink
            alignItems="center"
            borderColor={border}
            borderRadius="12px"
            borderWidth="1px"
            data-testid="store-switcher"
            display="flex"
            gap={2}
            h="44px"
            maxW="calc(100% - 96px)"
            pl="6px"
            pr={3}
            textDecoration="none"
            to="/trocar-loja"
          >
            <Center
              bg="#093A58"
              borderRadius="8px"
              boxSize="30px"
              color="white"
              fontSize="12px"
              fontWeight="bold"
              overflow="hidden"
            >
              {selectedCompany?.avatarUrl ? (
                <Image
                  alt=""
                  h="30px"
                  objectFit="cover"
                  src={selectedCompany.avatarUrl}
                  w="30px"
                />
              ) : (
                initials(name)
              )}
            </Center>
            <Text
              color={text}
              fontSize="15px"
              fontWeight="semibold"
              truncate
            >
              {name}
            </Text>
            <Icon
              as={LuChevronDown}
              boxSize="18px"
              color={text}
            />
          </ShellLink>
        )}
        {switcher ? (
          <Text
            color={text}
            fontSize="16px"
            fontWeight="semibold"
            left={0}
            pointerEvents="none"
            position="absolute"
            right={0}
            textAlign="center"
          >
            Trocar loja
          </Text>
        ) : null}
        <Box
          alignItems="center"
          display="flex"
        >
          {switcher ? null : <NotificationButton />}
          <ColorModeButton
            minH="44px"
            minW="44px"
            variant="ghost"
          />
        </Box>
      </Box>
      {switcher ? null : (
        <Box
          pb="10px"
          px={4}
        >
          {showBack ? (
            <Button
              color={backColor}
              display="flex"
              fontSize="16px"
              fontWeight="medium"
              h="44px"
              justifyContent="flex-start"
              mb={1}
              minW="44px"
              onClick={() => navigate(-1)}
              px={0}
              type="button"
              variant="ghost"
            >
              <LuChevronLeft size={22} />
              Voltar
            </Button>
          ) : null}
          <Text
            color={text}
            fontSize="24px"
            fontWeight="bold"
            lineHeight="29px"
          >
            {title}
          </Text>
        </Box>
      )}
    </Box>
  )
}

function NotificationButton() {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton
          aria-label="Notificações"
          minH="44px"
          minW="44px"
          position="relative"
          variant="ghost"
        >
          <LuBell size={22} />
          <Box
            bg="#C2410C"
            borderColor="white"
            borderWidth="2px"
            boxSize="8px"
            css={{ _dark: { borderColor: 'var(--chakra-colors-gray-900)' } }}
            position="absolute"
            right="10px"
            rounded="full"
            top="10px"
          />
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
  )
}
