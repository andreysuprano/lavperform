import { Stack } from '@chakra-ui/react'
import { LuCalendarDays } from 'react-icons/lu'

import { AppContentLayout, LoadingState, PostCalendar, SocialPhoneLinks } from '@/components'
import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import { useAuth } from '@/context/AuthContext'
import { usePostActions, useScheduledPosts } from '@/hooks/queries/useSocialPublishing'
import type { ScheduledPost } from '@/types'

export function SocialCalendarPage() {
  const phone = useShellMode() === 'phone'
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? ''
  const year = new Date().getFullYear()
  const posts = useScheduledPosts(companyId, `${year - 1}-01-01T00:00:00.000Z`, `${year + 1}-12-31T23:59:59.000Z`)
  const actions = usePostActions(companyId)
  const body = (
    <Stack gap={4}>
      <SocialPhoneLinks />
      {posts.isLoading ? (
        <LoadingState title="Carregando calendário..." />
      ) : (
        <PostCalendar
          onCancel={async (post) => {
            await actions.cancel.mutateAsync(post.id)
          }}
          onRetry={async (post) => {
            await actions.retry.mutateAsync(post.id)
          }}
          onSave={async (post: ScheduledPost, input) => {
            await actions.update.mutateAsync({ id: post.id, body: input })
          }}
          phone={phone}
          posts={posts.data ?? []}
        />
      )}
    </Stack>
  )
  if (phone) return body
  return (
    <AppContentLayout
      icon={<LuCalendarDays />}
      title="Calendário de posts"
    >
      {body}
    </AppContentLayout>
  )
}
