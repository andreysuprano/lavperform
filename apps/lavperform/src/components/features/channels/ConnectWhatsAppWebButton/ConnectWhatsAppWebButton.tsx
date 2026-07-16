import { Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { BsWhatsapp } from 'react-icons/bs'

import { CustomDialog } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useWhatsAppWebChannel } from '@/hooks/useWhatsAppWebChannel'

import { Props } from './ConnectWhatsAppWebButton.types'

function ConnectWhatsAppWebButtonBase({ trigger, onConnected }: Props) {
  const { selectedCompany } = useAuth()
  const { connection, isPending, isConnected, connect, isLoading } =
    useWhatsAppWebChannel(selectedCompany?.id)

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleConnect = async () => {
    await connect()
    setIsDialogOpen(true)
  }

  useEffect(() => {
    if (isConnected && isDialogOpen) {
      setIsDialogOpen(false)
      onConnected?.()
    }
  }, [isConnected, isDialogOpen, onConnected])

  if (!selectedCompany) return null

  return (
    <CustomDialog
      content={
        <Stack
          gap={4}
          p={6}
        >
          <Heading size="md">
            Para conectar seu WhatsApp, siga os passos abaixo:
          </Heading>
          <Stack gap={2}>
            <Text>1. Abra o WhatsApp no seu celular</Text>
            <Text>
              2. Toque em Menu ou Configurações e selecione Dispositivos
              conectados
            </Text>
            <Text>3. Toque em Conectar um dispositivo</Text>
            <Text>
              4. Aponte seu celular para esta tela para escanear o QR code
            </Text>
          </Stack>
          {connection?.code && isPending && (
            <Flex
              alignItems="center"
              bg="white"
              borderRadius="md"
              justifyContent="center"
              mt={4}
              p={4}
            >
              <img
                alt="QR Code"
                src={connection.code}
              />
            </Flex>
          )}
          <Text
            color="gray.500"
            fontSize="sm"
            textAlign="center"
          >
            {isPending
              ? 'Aguardando leitura do QR Code...'
              : 'Gerando QR Code...'}
          </Text>
        </Stack>
      }
      isOpen={isDialogOpen}
      onOpenChange={(details) => setIsDialogOpen(details.open)}
      title="Conectar WhatsApp"
      trigger={
        <Button
          asChild
          loading={isLoading}
          loadingText="Conectando..."
          onClick={handleConnect}
          size="sm"
          variant="outline"
        >
          {trigger || (
            <Button
              size="sm"
              variant="outline"
              w="full"
            >
              <BsWhatsapp />
              Conectar Agora
            </Button>
          )}
        </Button>
      }
    />
  )
}

export {
  ConnectWhatsAppWebButtonBase as ConnectWhatsAppWebButton,
  type Props as ConnectWhatsAppWebButtonProps,
}
