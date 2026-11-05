import {
  useConnections,
  usePostActions,
  useScheduleSlots,
} from '@/hooks/queries/useSocialPublishing'
import type { PublishChannel } from '@/types'

import { formatWhen } from './monthGrid'
import { ScheduleComposer } from './ScheduleComposer'

const LABEL: Record<PublishChannel, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  GOOGLE_BUSINESS: 'Google',
}

export function ReviewSchedule({
  companyId,
  draftId,
  variationId,
  caption,
  headline,
  imageDataUrl,
}: {
  companyId: string
  draftId?: string
  variationId?: string
  caption: string
  headline?: string
  imageDataUrl?: string
}) {
  const connections = useConnections(companyId)
  const slots = useScheduleSlots()
  const actions = usePostActions(companyId)
  if (!companyId) return null
  return (
    <ScheduleComposer
      caption={caption}
      connections={connections.data?.connections ?? []}
      onSubmit={async (input) => {
        const created = await actions.create.mutateAsync({
          companyId,
          draftId,
          variationId,
          headline,
          imageDataUrl,
          caption: input.caption,
          channels: input.channels,
          publishNow: input.publishNow,
          scheduledAt: input.scheduledAt,
        })
        return {
          when: input.publishNow ? 'agora' : formatWhen(created.data.scheduledAt),
          channels: input.channels.map((channel) => LABEL[channel]),
        }
      }}
      pending={actions.create.isPending}
      slots={slots.data ?? []}
    />
  )
}
