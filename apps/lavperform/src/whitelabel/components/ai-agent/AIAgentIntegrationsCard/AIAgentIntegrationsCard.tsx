import { Card, SimpleGrid } from '@chakra-ui/react'
import { memo } from 'react'
import { RiChat1Line, RiMailLine, RiWhatsappLine } from 'react-icons/ri'

import { IntegrationCard } from './IntegrationCard'
import { Props } from './AIAgentIntegrationsCard.types'

function AIAgentIntegrationsCardBase({
  whatsapp,
  email,
  chat,
  onWhatsAppToggle,
  onEmailToggle,
  onChatToggle,
}: Props) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Integrações</Card.Title>
      </Card.Header>
      <Card.Body>
        <SimpleGrid
          columns={{ base: 1, md: 3 }}
          gap={4}
        >
          <IntegrationCard
            icon={RiWhatsappLine}
            name="WhatsApp"
            enabled={whatsapp}
            onToggle={onWhatsAppToggle}
          />
          <IntegrationCard
            icon={RiMailLine}
            name="E-mail"
            enabled={email}
            onToggle={onEmailToggle}
          />
          <IntegrationCard
            icon={RiChat1Line}
            name="Chat"
            enabled={chat}
            onToggle={onChatToggle}
          />
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}

const AIAgentIntegrationsCard = memo(
  AIAgentIntegrationsCardBase
) as typeof AIAgentIntegrationsCardBase

export { AIAgentIntegrationsCard, type Props as AIAgentIntegrationsCardProps }
