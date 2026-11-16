import { Button, Menu, Portal, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'
import { LuRadio } from 'react-icons/lu'

import { useAuth } from '@/context/AuthContext'

import { ActiveChannelBadge } from '../ActiveChannelBadge/ActiveChannelBadge'
import { ChannelDropdownCard } from '../ChannelDropdownCard/ChannelDropdownCard'
import { ComingSoonBadge } from '../ComingSoonBadge/ComingSoonBadge'
import { MetaIntegrationDropdownCard } from '../MetaIntegrationDropdownCard/MetaIntegrationDropdownCard'
import { WhatsAppDropdownCard } from '../WhatsAppDropdownCard/WhatsAppDropdownCard'
import { DROPDOWN_CHANNELS } from './channelDropdown.constants'

function ChannelDropdownBase() {
  const { selectedCompany } = useAuth()

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          aria-label="Canais de Comunicação"
          className="shell-touch-44"
          display={{ base: 'none', md: 'flex' }}
          size="sm"
          variant="outline"
        >
          <Text
            as="span"
            className="shell-only-below-desktop"
          >
            <LuRadio />
          </Text>
          <Text
            className="shell-hide-below-desktop"
            fontSize="sm"
          >
            Canais de Comunicação
          </Text>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="260px" p={3}>
            <VStack align="stretch" gap={2}>
              {DROPDOWN_CHANNELS.map((channel) =>
                channel.showStatus && selectedCompany ? (
                  <WhatsAppDropdownCard
                    companyId={selectedCompany.id}
                    icon={channel.icon}
                    key={channel.name}
                    name={channel.name}
                  />
                ) : channel.showMetaStatus && selectedCompany ? (
                  <MetaIntegrationDropdownCard
                    companyId={selectedCompany.id}
                    icon={channel.icon}
                    key={channel.name}
                    name={channel.name}
                  />
                ) : channel.showActiveBadge ? (
                  <ChannelDropdownCard
                    badge={<ActiveChannelBadge />}
                    icon={channel.icon}
                    key={channel.name}
                    name={channel.name}
                  />
                ) : (
                  <ChannelDropdownCard
                    badge={<ComingSoonBadge />}
                    icon={channel.icon}
                    key={channel.name}
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
