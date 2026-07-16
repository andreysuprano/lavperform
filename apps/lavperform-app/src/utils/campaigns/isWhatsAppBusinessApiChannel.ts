import type { ChannelKey } from '@/components/features/channels/channelCatalog.constants'

export function isWhatsAppBusinessApiChannel(
  channels?: ChannelKey[],
): boolean {
  return channels?.[0] === 'whatsapp_business_api'
}
