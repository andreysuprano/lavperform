import { Button, SimpleGrid } from '@chakra-ui/react'
import { memo } from 'react'

import {
  CHANNEL_CATALOG,
  CHANNELS_PAGE_ORDER,
  type ChannelCatalogItem,
} from '@/components/features/channels/channelCatalog.constants'
import { useAuth } from '@/context/AuthContext'
import { useWhatsAppWebChannel } from '@/hooks/useWhatsAppWebChannel'

import { ChannelCard } from '../ChannelCard/ChannelCard'
import { ConnectWhatsAppWebButton } from '../ConnectWhatsAppWebButton/ConnectWhatsAppWebButton'
import { DisconnectWhatsAppWebButton } from '../DisconnectWhatsAppWebButton/DisconnectWhatsAppWebButton'
import { WhatsAppBusinessAPIButton } from '../WhatsAppBusinessAPIButton/WhatsAppBusinessAPIButton'

type ChannelPageRow = ChannelCatalogItem & {
  channelsPage: NonNullable<ChannelCatalogItem['channelsPage']>
}

function getChannelPageRows(): ChannelPageRow[] {
  const rows: ChannelPageRow[] = []
  for (const key of CHANNELS_PAGE_ORDER) {
    const item = CHANNEL_CATALOG.find((c) => c.key === key)
    if (item?.channelsPage) {
      rows.push({ ...item, channelsPage: item.channelsPage })
    }
  }
  return rows
}

function WhatsAppWebChannelActionBase({ companyId }: { companyId: string }) {
  const { isConnected } = useWhatsAppWebChannel(companyId)

  if (isConnected) {
    return <DisconnectWhatsAppWebButton />
  }

  return <ConnectWhatsAppWebButton />
}

const WhatsAppWebChannelAction = memo(
  WhatsAppWebChannelActionBase
) as typeof WhatsAppWebChannelActionBase

const ComingSoonButton = memo(() => (
  <Button
    cursor="not-allowed"
    disabled
    opacity={0.5}
    size="sm"
    variant="outline"
    w="full"
  >
    Em breve
  </Button>
))

const ActivatedChannelButton = memo(() => (
  <Button
    colorPalette="green"
    cursor="default"
    disabled
    size="sm"
    variant="outline"
    w="full"
  >
    Ativado
  </Button>
))

type FooterKind = NonNullable<ChannelCatalogItem['channelsPage']>['footerKind']

function renderChannelFooterAction(
  footerKind: FooterKind,
  selectedCompany: { id: string } | null | undefined
) {
  if (footerKind === 'whatsapp_web') {
    if (selectedCompany) {
      return <WhatsAppWebChannelAction companyId={selectedCompany.id} />
    }
    return <ComingSoonButton />
  }
  if (footerKind === 'whatsapp_business_api') {
    if (selectedCompany) {
      return <WhatsAppBusinessAPIButton companyId={selectedCompany.id} />
    }
    return <ComingSoonButton />
  }
  if (footerKind === 'activated_only') {
    return <ActivatedChannelButton />
  }
  return <ComingSoonButton />
}

export const ChannelList = () => {
  const { selectedCompany } = useAuth()
  const rows = getChannelPageRows()

  return (
    <SimpleGrid
      columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
      gap={4}
    >
      {rows.map((channel) => (
        <ChannelCard
          key={channel.key}
          action={renderChannelFooterAction(
            channel.channelsPage.footerKind,
            selectedCompany
          )}
          badgeColorPalette={channel.badgeColorPalette}
          badgeLabel={channel.badgeLabel}
          description={channel.channelsPage.description}
          icon={channel.icon}
          isAvailable={channel.channelsPage.cardActive}
          name={channel.name}
        />
      ))}
    </SimpleGrid>
  )
}
