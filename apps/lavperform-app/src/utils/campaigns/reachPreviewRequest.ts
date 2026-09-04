import type { ChannelKey } from '@/components/features/channels/channelCatalog.constants'
import type { AudienceTargetingMode, ReachPreviewRequest } from '@/types'

import { channelKeyToApiChannel } from './channelKeyToApiChannel'

export type ReachPreviewFormInput = {
  targetingMode?: AudienceTargetingMode
  segmentation?: string[]
  audienceId?: string | null
  customSendListId?: string | null
  channels?: ChannelKey[]
}

export function hasReachPreviewChannel(channels?: ChannelKey[]): boolean {
  return Boolean(channels?.[0])
}

export function isReachPreviewTargetingReady(
  input: ReachPreviewFormInput
): boolean {
  const targetingMode = input.targetingMode ?? 'RFV'

  if (targetingMode === 'AUDIENCE') {
    return Boolean(input.audienceId)
  }

  if (targetingMode === 'CUSTOMER_LIST') {
    return Boolean(input.customSendListId)
  }

  return Boolean(input.segmentation?.length)
}

/**
 * Monta o body do reach-preview. Retorna `null` quando não há canal,
 * a conversão do canal falha ou o targeting ainda está incompleto.
 */
export function toReachPreviewRequest(
  input: ReachPreviewFormInput
): ReachPreviewRequest | null {
  const channelKey = input.channels?.[0]
  if (!channelKey) return null
  if (!isReachPreviewTargetingReady(input)) return null

  const channel = channelKeyToApiChannel(channelKey)
  if (!channel) return null

  const targetingMode = input.targetingMode ?? 'RFV'

  if (targetingMode === 'AUDIENCE') {
    return {
      targetingMode,
      audienceId: input.audienceId!,
      channel,
    }
  }

  if (targetingMode === 'CUSTOMER_LIST') {
    return {
      targetingMode,
      customSendListId: input.customSendListId!,
      channel,
    }
  }

  return {
    targetingMode,
    segmentation: input.segmentation!.join(','),
    channel,
  }
}
