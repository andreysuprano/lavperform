import { Button } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { TbBrandMeta } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

import { useMetaIntegrationAvailability } from '@/hooks/queries'

type Props = {
  companyId: string
}

function WhatsAppBusinessAPIButtonBase({ companyId }: Props) {
  const navigate = useNavigate()
  const { data, isLoading } = useMetaIntegrationAvailability(companyId)

  const hasIntegration =
    data?.status === 'ACTIVE' ||
    (Boolean(data?.hasPhoneNumberId) && Boolean(data?.hasWabaId))
  const isFullyActive = data?.available === true

  const handleClick = useCallback(() => {
    navigate('/channels/whatsapp-business-api')
  }, [navigate])

  return (
    <Button
      colorPalette={isFullyActive ? 'green' : hasIntegration ? 'orange' : 'blue'}
      loading={isLoading}
      loadingText="Verificando..."
      onClick={handleClick}
      size="sm"
      variant={isFullyActive ? 'outline' : 'solid'}
      w="full"
    >
      <TbBrandMeta />
      {hasIntegration ? 'Minha Integração' : 'Ativar'}
    </Button>
  )
}

const WhatsAppBusinessAPIButton = memo(
  WhatsAppBusinessAPIButtonBase
) as typeof WhatsAppBusinessAPIButtonBase

WhatsAppBusinessAPIButton.displayName = 'WhatsAppBusinessAPIButton'

export {
  WhatsAppBusinessAPIButton,
  type Props as WhatsAppBusinessAPIButtonProps,
}
