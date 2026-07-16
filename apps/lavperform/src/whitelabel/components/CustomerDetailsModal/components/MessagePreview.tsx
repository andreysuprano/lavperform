import { Box, Flex, Popover, Text } from '@chakra-ui/react'
import { RiMailLine, RiMegaphoneLine, RiWhatsappLine } from 'react-icons/ri'

import type { MessageChannel } from './TimelineEvent.types'

interface Props {
  channel: MessageChannel
  preview: string
  fullContent: string
}

const channelNames: Record<MessageChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  app: 'App',
  sms: 'SMS',
}

const channelIcons: Record<MessageChannel, any> = {
  whatsapp: RiWhatsappLine,
  email: RiMailLine,
  app: RiMegaphoneLine,
  sms: RiMailLine,
}

export function MessagePreview({ channel, preview, fullContent }: Props) {
  const ChannelIcon = channelIcons[channel]
  const channelName = channelNames[channel]

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Flex
          align="center"
          cursor="pointer"
          gap={2}
          _hover={{ opacity: 0.8 }}
        >
          <ChannelIcon
            color="gray.600"
            size={16}
          />
          <Text
            color="gray.700"
            fontSize="sm"
            lineClamp={1}
          >
            {preview}
          </Text>
        </Flex>
      </Popover.Trigger>

      <Popover.Content>
        <Popover.Arrow />
        <Popover.Header>
          <Flex
            align="center"
            gap={2}
          >
            <ChannelIcon size={18} />
            <Text fontWeight="medium">Mensagem enviada via {channelName}</Text>
          </Flex>
        </Popover.Header>
        <Popover.Body>
          <Box maxW="400px">
            <Text whiteSpace="pre-wrap">{fullContent}</Text>
          </Box>
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  )
}
