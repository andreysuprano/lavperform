import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { BsWhatsapp } from 'react-icons/bs'

import { CustomDialog } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'

import { Props } from './ConnectWhatsAppButton.types'
import { QrCode } from '@chakra-ui/react'

const ConnectWhatsAppButton = ({ trigger, onConnected }: Props) => {
  const { selectedCompany } = useAuth()
  const { connection, isPending, isConnected, connect, isLoading } =
    useWhatsAppManager(selectedCompany?.id)

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleConnect = async () => {
    await connect()
    setIsDialogOpen(true)
  }

  // Fecha modal quando conectar com sucesso
  useEffect(() => {
    if (isConnected && isDialogOpen) {
      setIsDialogOpen(false)
      onConnected?.()
    }
  }, [isConnected, isDialogOpen, onConnected])

  useEffect(() => {
    console.log('connection', connection?.code)
  }, [connection])

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
              bg="white"
              borderRadius="md"
              mt={4}
              alignItems="center"
              justifyContent="center"
              p={4}
            >
              <img
                src={connection.code}
                alt="QR Code"
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
              Conectar WhatsApp
            </Button>
          )}
        </Button>
      }
    />
  )
}

export { ConnectWhatsAppButton, type Props as ConnectWhatsAppButtonProps }
