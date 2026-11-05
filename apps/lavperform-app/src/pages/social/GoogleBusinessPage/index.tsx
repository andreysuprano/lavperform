import { Stack } from '@chakra-ui/react'
import { LuMapPin } from 'react-icons/lu'

import {
  AppContentLayout,
  GoogleBusinessPanel,
  LoadingState,
  SocialPhoneLinks,
} from '@/components'
import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import { useAuth } from '@/context/AuthContext'
import { useGoogleProfile, useReplyReview } from '@/hooks/queries/useSocialPublishing'

export function GoogleBusinessPage() {
  const phone = useShellMode() === 'phone'
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? ''
  const profile = useGoogleProfile(companyId)
  const reply = useReplyReview(companyId)
  const body = (
    <Stack gap={4}>
      <SocialPhoneLinks />
      {profile.isLoading || !profile.data ? (
        <LoadingState title="Carregando o perfil..." />
      ) : (
        <GoogleBusinessPanel
          data={profile.data}
          onReply={async (reviewId, comment) => {
            await reply.mutateAsync({ reviewId, comment })
          }}
        />
      )}
    </Stack>
  )
  if (phone) return body
  return (
    <AppContentLayout
      icon={<LuMapPin />}
      title="Google Meu Negócio"
    >
      {body}
    </AppContentLayout>
  )
}
