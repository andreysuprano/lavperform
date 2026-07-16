import { Button } from '@chakra-ui/react'
import { RiCloseCircleLine } from 'react-icons/ri'

import { DeleteConfirmationDialog } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useWhatsAppWebChannel } from '@/hooks/useWhatsAppWebChannel'

import { Props } from './DisconnectWhatsAppWebButton.types'

function DisconnectWhatsAppWebButtonBase({ trigger, onDisconnected }: Props) {
  const { selectedCompany } = useAuth()
  const { disconnect, isLoading } = useWhatsAppWebChannel(selectedCompany?.id)

  const handleDisconnect = async () => {
    const success = await disconnect()
    if (success) {
      onDisconnected?.()
    }
  }

  if (!selectedCompany) return null

  return (
    <DeleteConfirmationDialog
      confirmButton={
        <>
          <RiCloseCircleLine />
          Desconectar WhatsApp
        </>
      }
      description="Ao desconectar, você precisará conectar novamente para enviar mensagens pelo WhatsApp."
      isLoading={isLoading}
      onClick={handleDisconnect}
      title="Deseja desconectar o WhatsApp?"
      trigger={
        trigger || (
          <Button
            colorPalette="red"
            loading={isLoading}
            loadingText="Desconectando..."
            size="sm"
            variant="outline"
            w="full"
          >
            <RiCloseCircleLine />
            Desconectar WhatsApp
          </Button>
        )
      }
    />
  )
}

export {
  DisconnectWhatsAppWebButtonBase as DisconnectWhatsAppWebButton,
  type Props as DisconnectWhatsAppWebButtonProps,
}
