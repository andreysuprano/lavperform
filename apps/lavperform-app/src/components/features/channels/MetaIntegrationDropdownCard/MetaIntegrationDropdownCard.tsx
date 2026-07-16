import { Badge } from '@chakra-ui/react'
import { memo } from 'react'

import { useMetaIntegrationAvailability } from '@/hooks/queries'

import { ChannelDropdownCard } from '../ChannelDropdownCard/ChannelDropdownCard'
import { ChannelStatusIndicator } from '../ChannelStatusIndicator/ChannelStatusIndicator'

import type { Props } from './MetaIntegrationDropdownCard.types'

function MetaIntegrationDropdownCardBase({ companyId, icon, name }: Props) {
  const { data, isLoading } = useMetaIntegrationAvailability(companyId)
  const hasIntegration =
    data?.status === 'ACTIVE' ||
    (Boolean(data?.hasPhoneNumberId) && Boolean(data?.hasWabaId))
  const isFullyActive = data?.available === true
  let badgeLabel = 'Não configurado'

  if (isLoading) {
    badgeLabel = 'Verificando'
  } else if (isFullyActive) {
    badgeLabel = 'Ativo'
  } else if (hasIntegration) {
    badgeLabel = 'Pendente'
  }

  return (
    <ChannelDropdownCard
      badge={
        <Badge
          colorPalette={isFullyActive ? 'green' : hasIntegration ? 'orange' : 'gray'}
          size="xs"
          variant="subtle"
        >
          {badgeLabel}
        </Badge>
      }
      icon={icon}
      name={name}
      statusIndicator={<ChannelStatusIndicator isConnected={isFullyActive} />}
    />
  )
}

const MetaIntegrationDropdownCard = memo(
  MetaIntegrationDropdownCardBase
) as typeof MetaIntegrationDropdownCardBase

MetaIntegrationDropdownCard.displayName = 'MetaIntegrationDropdownCard'

export {
  MetaIntegrationDropdownCard,
  type Props as MetaIntegrationDropdownCardProps,
}
