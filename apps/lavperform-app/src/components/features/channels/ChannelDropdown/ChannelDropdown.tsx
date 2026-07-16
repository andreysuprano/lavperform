import { Button, Menu, Portal, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

import { useAuth } from '@/context/AuthContext'

import { ActiveChannelBadge } from '../ActiveChannelBadge/ActiveChannelBadge'
import { ComingSoonBadge } from '../ComingSoonBadge/ComingSoonBadge'
import { ChannelDropdownCard } from '../ChannelDropdownCard/ChannelDropdownCard'
import { MetaIntegrationDropdownCard } from '../MetaIntegrationDropdownCard/MetaIntegrationDropdownCard'
import { WhatsAppDropdownCard } from '../WhatsAppDropdownCard/WhatsAppDropdownCard'

import { DROPDOWN_CHANNELS } from './channelDropdown.constants'

function ChannelDropdownBase() {
  const { selectedCompany } = useAuth()

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          display={{ base: 'none', lg: 'flex' }}
          size="sm"
          variant="outline"
        >
          <Text fontSize="sm">Canais de Comunicação</Text>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="260px" p={3}>
            <VStack align="stretch" gap={2}>
              {DROPDOWN_CHANNELS.map((channel) =>
                channel.showStatus && selectedCompany ? (
                  <WhatsAppDropdownCard
                    key={channel.name}
                    companyId={selectedCompany.id}
                    icon={channel.icon}
                    name={channel.name}
                  />
                ) : channel.showMetaStatus && selectedCompany ? (
                  <MetaIntegrationDropdownCard
                    key={channel.name}
                    companyId={selectedCompany.id}
                    icon={channel.icon}
                    name={channel.name}
                  />
                ) : channel.showActiveBadge ? (
                  <ChannelDropdownCard
                    key={channel.name}
                    badge={<ActiveChannelBadge />}
                    icon={channel.icon}
                    name={channel.name}
                  />
                ) : (
                  <ChannelDropdownCard
                    key={channel.name}
                    badge={<ComingSoonBadge />}
                    icon={channel.icon}
                    name={channel.name}
                  />
                )
              )}
            </VStack>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

const ChannelDropdown = memo(ChannelDropdownBase)

export { ChannelDropdown }
