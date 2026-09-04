import type { ChannelKey } from '@/components/features/channels/channelCatalog.constants'
import type { AutomaticCampaignApiChannel } from '@/types'

const CHANNEL_KEY_TO_API: Record<ChannelKey, AutomaticCampaignApiChannel> = {
  whatsapp_web: 'WHATSAPP_WEB',
  whatsapp_business_api: 'WHATSAPP_BUSINESS_API',
  sms: 'SMS',
  email: 'EMAIL',
  rcs: 'RCS',
  push_notification: 'PUSH_NOTIFICATION',
}

export function channelKeyToApiChannel(
  key: ChannelKey | string | null | undefined
): AutomaticCampaignApiChannel | null {
  if (!key) return null
  return CHANNEL_KEY_TO_API[key as ChannelKey] ?? null
}
