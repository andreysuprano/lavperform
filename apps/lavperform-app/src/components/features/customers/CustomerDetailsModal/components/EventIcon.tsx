import { Box } from '@chakra-ui/react'
import {
  RiAlertLine,
  RiCheckLine,
  RiCouponLine,
  RiMailLine,
  RiMegaphoneLine,
  RiRefreshLine,
  RiShoppingCartLine,
  RiUserLine,
  RiWhatsappLine,
} from 'react-icons/ri'

import type { EventType, MessageChannel } from './TimelineEvent.types'

interface Props {
  type: EventType
  channel?: MessageChannel
}

const eventIconMap: Record<EventType, any> = {
  purchase: RiShoppingCartLine,
  repurchase: RiRefreshLine,
  coupon_received: RiCouponLine,
  message_sent: RiWhatsappLine, // Default, será substituído pelo canal
  rfv_changed: RiUserLine,
  campaign_entered: RiMegaphoneLine,
  campaign_exited: RiMegaphoneLine,
  risk_detected: RiAlertLine,
  recovered: RiCheckLine,
}

const channelIconMap: Record<MessageChannel, any> = {
  whatsapp: RiWhatsappLine,
  email: RiMailLine,
  app: RiMegaphoneLine,
  sms: RiMailLine,
}

const eventColorMap: Record<EventType, string> = {
  purchase: 'blue.500',
  repurchase: 'blue.600',
  coupon_received: 'purple.500',
  message_sent: 'green.500', // WhatsApp verde
  rfv_changed: 'gray.500',
  campaign_entered: 'purple.600',
  campaign_exited: 'gray.600',
  risk_detected: 'orange.500',
  recovered: 'green.600',
}

export function EventIcon({ type, channel }: Props) {
  // Para mensagens, usar ícone do canal
  const Icon =
    type === 'message_sent' && channel
      ? channelIconMap[channel]
      : eventIconMap[type]

  const color = eventColorMap[type]

  return (
    <Box
      alignItems="center"
      bg={color}
      border="3px solid"
      borderColor="white"
      borderRadius="full"
      boxShadow="0 0 0 1px rgba(0,0,0,0.1)"
      color="white"
      display="flex"
      flexShrink={0}
      h="40px"
      justifyContent="center"
      position="relative"
      w="40px"
      zIndex={1}
    >
      <Icon size={20} />
    </Box>
  )
}
