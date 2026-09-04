import { Box, Button, Menu, Portal, Text } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo } from 'react'

import { useAuth } from '@/context/AuthContext'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'
import { formatWhatsAppNumber } from '@/utils/mask'

import { ConnectWhatsAppButton } from '../ConnectWhatsAppButton/ConnectWhatsAppButton'
import { DisconnectWhatsAppButton } from '../DisconnectWhatsAppButton/DisconnectWhatsAppButton'

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`

export const WhatsAppConnectionStatus = () => {
  const { selectedCompany } = useAuth()
  const { isConnected } = useWhatsAppManager(selectedCompany?.id)

  const animation = `${pulse} 2s infinite`

  if (!selectedCompany) return null

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          display={{ base: 'none', lg: 'flex' }}
          gap={2}
          size={'sm'}
          variant="outline"
        >
          <Box
            animation={animation}
            bg={isConnected ? 'green.500' : 'red.500'}
            borderRadius="full"
            h="8px"
            w="8px"
          />
          <Text fontSize="sm">
            WhatsApp {isConnected ? 'Conectado' : 'Desconectado'}
          </Text>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            maxH={200}
            maxW={300}
            p={4}
          >
            {selectedCompany && (
              <WhatsAppButton companyId={selectedCompany.id} />
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

const WhatsAppButton = memo(({ companyId }: { companyId: string }) => {
  const { isConnected, status } = useWhatsAppManager(companyId)

  const phoneNumber = formatWhatsAppNumber(status?.phoneNumber)

  if (isConnected) {
    return (
      <>
        <Text
          fontSize={'sm'}
          pb={phoneNumber ? 1 : 4}
        >
          Atenção, o WhatsApp está conectado! Para desconectar, clique no botão
          ao lado.
        </Text>
        {phoneNumber && (
          <Text
            color="fg.muted"
            fontSize="sm"
            pb={4}
          >
            Número conectado: {phoneNumber}
          </Text>
        )}
        <DisconnectWhatsAppButton />
      </>
    )
  }

  return (
    <>
      <Text
        fontSize={'sm'}
        pb={phoneNumber ? 1 : 4}
      >
        Atenção, o WhatsApp deve ser conectado para enviar mensagens.
      </Text>
      {phoneNumber && (
        <Text
          color="fg.muted"
          fontSize="sm"
          pb={4}
        >
          Último número conectado: {phoneNumber}
        </Text>
      )}
      <ConnectWhatsAppButton />
    </>
  )
})
