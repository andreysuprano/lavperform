import { Badge } from '@chakra-ui/react'
import { memo } from 'react'

import { useWhatsAppWebChannel } from '@/hooks/useWhatsAppWebChannel'
import { formatWhatsAppNumber } from '@/utils/mask'

import { ChannelDropdownCard } from '../ChannelDropdownCard/ChannelDropdownCard'
import { ChannelStatusIndicator } from '../ChannelStatusIndicator/ChannelStatusIndicator'

import type { Props } from './WhatsAppDropdownCard.types'

function WhatsAppDropdownCardBase({ companyId, icon, name }: Props) {
  const { isConnected, status } = useWhatsAppWebChannel(companyId)

  const phoneNumber = formatWhatsAppNumber(status?.phoneNumber)

  return (
    <ChannelDropdownCard
      badge={
        <Badge
          colorPalette={isConnected ? 'green' : 'red'}
          size="xs"
          variant="subtle"
        >
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
      }
      icon={icon}
      name={name}
      statusIndicator={<ChannelStatusIndicator isConnected={isConnected} />}
      subtitle={phoneNumber || undefined}
    />
  )
}

const WhatsAppDropdownCard = memo(
  WhatsAppDropdownCardBase
) as typeof WhatsAppDropdownCardBase

WhatsAppDropdownCard.displayName = 'WhatsAppDropdownCard'

export { WhatsAppDropdownCard, type Props as WhatsAppDropdownCardProps }
