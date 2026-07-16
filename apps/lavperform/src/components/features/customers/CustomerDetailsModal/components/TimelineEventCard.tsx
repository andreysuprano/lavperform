import { Badge, Box, Flex, Text } from '@chakra-ui/react'

import { formatCurrency } from '@/utils/money'

import { CampaignBadge } from './CampaignBadge'
import { EventIcon } from './EventIcon'
import { HumanizedDate } from './HumanizedDate'
import { MessagePreview } from './MessagePreview'
import type { TimelineEvent } from './TimelineEvent.types'

interface Props {
  event: TimelineEvent
}

export function TimelineEventCard({ event }: Props) {
  return (
    <Flex
      gap={4}
      position="relative"
    >
      {/* Ícone do evento */}
      <EventIcon
        channel={event.message?.channel}
        type={event.type}
      />

      {/* Conteúdo do evento */}
      <Box flex={1}>
        {/* Título e data */}
        <Flex
          alignItems="flex-start"
          flexDirection={{ base: 'column', md: 'row' }}
          gap={{ base: 1, md: 2 }}
          justifyContent="space-between"
          mb={2}
        >
          <Text
            fontSize="md"
            fontWeight="bold"
          >
            {event.title}
          </Text>
          <HumanizedDate
            compact
            timestamp={event.timestamp}
          />
        </Flex>

        {/* Descrição */}
        {event.description && (
          <Text
            color="gray.600"
            fontSize="sm"
            mb={2}
          >
            {event.description}
          </Text>
        )}

        {/* Detalhes específicos por tipo de evento */}
        <Flex
          flexDirection="column"
          gap={2}
        >
          {/* Compra */}
          {event.purchase && (
            <Flex
              alignItems="center"
              gap={2}
            >
              <Text
                color="gray.600"
                fontSize="sm"
              >
                Canal: {event.purchase.channel}
              </Text>
              <Text
                color="gray.600"
                fontSize="sm"
              >
                • Compra no valor {formatCurrency(event.purchase.amount)}
              </Text>
            </Flex>
          )}

          {/* Mensagem */}
          {event.message && (
            <MessagePreview
              channel={event.message.channel}
              fullContent={event.message.fullContent}
              preview={event.message.preview}
            />
          )}

          {/* Mudança RFV */}
          {event.rfvChange && (
            <Flex
              alignItems="center"
              gap={2}
            >
              <Badge
                colorPalette="red"
                variant="subtle"
              >
                {event.rfvChange.from}
              </Badge>
              <Text
                color="gray.600"
                fontSize="sm"
              >
                →
              </Text>
              <Badge
                colorPalette="green"
                variant="subtle"
              >
                {event.rfvChange.to}
              </Badge>
            </Flex>
          )}

          {/* Campanha */}
          {event.campaign && (
            <Box>
              <CampaignBadge campaign={event.campaign} />
            </Box>
          )}
        </Flex>
      </Box>
    </Flex>
  )
}
