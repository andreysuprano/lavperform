import { LuSparkles } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'

import {
  AppContentLayout,
  LoadingState,
  PostVariationsView,
} from '@/components'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import {
  useBrandIdentity,
  useGenerateMoreVariations,
  useSelectVariation,
  useSocialDraft,
  useUpdateVariation,
} from '@/hooks/queries/useSocialPosts'
import { socialPostsService } from '@/services'
import type { CaptionLength, PostVariation } from '@/types'
import { captionWithHashtags, DEFAULT_BRAND } from '@/types'

export function SocialVariationsPage() {
  const { draftId = '' } = useParams()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const brand = useBrandIdentity(selectedCompany?.id)
  const draft = useSocialDraft(draftId)
  const select = useSelectVariation(draftId)
  const more = useGenerateMoreVariations(draftId)
  const update = useUpdateVariation(draftId)

  const identity = brand.data ?? {
    ...DEFAULT_BRAND,
    id: null,
    companyId: selectedCompany?.id ?? '',
    persisted: false,
  }

  const copy = async (variation: PostVariation) => {
    await navigator.clipboard.writeText(captionWithHashtags(variation))
    toaster.create({ title: 'Legenda copiada', type: 'success' })
  }

  const changeCaption = (variationId: string, text: string) => {
    const current = draft.data?.variations.find(
      (item) => item.id === variationId
    )
    if (!current) return
    const field =
      current.activeCaption === 'short'
        ? 'captionShort'
        : current.activeCaption === 'long'
          ? 'captionLong'
          : 'captionMedium'
    update.mutate({ variationId, payload: { [field]: text } })
  }

  return (
    <AppContentLayout
      icon={<LuSparkles />}
      title="Gerador de posts"
    >
      {draft.isLoading || !draft.data ? (
        <LoadingState title="Carregando variações..." />
      ) : (
        <PostVariationsView
          brand={identity}
          busy={more.isPending || update.isPending}
          draft={draft.data}
          onAdjustBriefing={() => navigate('/social/generator')}
          onCaptionChange={changeCaption}
          onCaptionLength={(variationId, length: CaptionLength) =>
            update.mutate({ variationId, payload: { activeCaption: length } })
          }
          onCopy={copy}
          onEdit={(variationId) =>
            navigate(`/social/revise/${draftId}/${variationId}`)
          }
          onMore={() => more.mutate()}
          onRegenerate={async (variationId) => {
            await socialPostsService.regenerateBackground(variationId, 0)
            await draft.refetch()
          }}
          onRewrite={async (variationId) => {
            const current = draft.data?.variations.find(
              (item) => item.id === variationId
            )
            await socialPostsService.rewriteCaption(
              variationId,
              current?.activeCaption || 'medium'
            )
            await draft.refetch()
          }}
          onSelect={(variationId) => select.mutate(variationId)}
        />
      )}
    </AppContentLayout>
  )
}
