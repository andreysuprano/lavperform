import { Button } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuPencil } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'

import { AppContentLayout, LoadingState, PostLayerEditor } from '@/components'
import { downloadPostImage } from '@/components/features/social-posts/exportPost'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import {
  useBrandIdentity,
  useSocialDraft,
} from '@/hooks/queries/useSocialPosts'
import { socialPostsService } from '@/services'
import type { PostVariation } from '@/types'
import { captionWithHashtags, DEFAULT_BRAND } from '@/types'

export function SocialEditorPage() {
  const { draftId = '', variationId = '' } = useParams()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const brandQuery = useBrandIdentity(selectedCompany?.id)
  const draft = useSocialDraft(draftId)
  const [variation, setVariation] = useState<PostVariation | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const found = draft.data?.variations.find((item) => item.id === variationId)
    if (found) setVariation(found)
  }, [draft.data, variationId])

  const brand = brandQuery.data ?? {
    ...DEFAULT_BRAND,
    id: null,
    companyId: selectedCompany?.id ?? '',
    persisted: false,
  }

  const persist = async (next: PostVariation, slideIndex = 0) => {
    setVariation(next)
    const slide = next.slides[slideIndex]
    await socialPostsService.updateVariation(next.id, {
      slideIndex,
      layers: slide?.layers,
      headline: next.headline,
      badgeText: next.badgeText ?? '',
      activeCaption: next.activeCaption,
      captionShort: next.captionShort,
      captionMedium: next.captionMedium,
      captionLong: next.captionLong,
      hashtags: next.hashtags,
    })
  }

  return (
    <AppContentLayout
      action={
        <Button
          onClick={() => navigate(`/social/generator/${draftId}`)}
          variant="outline"
        >
          Voltar às variações
        </Button>
      }
      icon={<LuPencil />}
      title="Editar post"
    >
      {!variation || !draft.data ? (
        <LoadingState title="Abrindo editor..." />
      ) : (
        <PostLayerEditor
          brand={brand}
          busy={busy}
          format={draft.data.format}
          onChange={(next) => {
            setVariation(next)
          }}
          onCopyCaption={async () => {
            await navigator.clipboard.writeText(captionWithHashtags(variation))
            toaster.create({ title: 'Legenda copiada', type: 'success' })
          }}
          onDownload={async (slideIndex) => {
            const slide = variation.slides[slideIndex] ?? variation.slides[0]
            if (!slide) return
            await persist(variation, slideIndex)
            await downloadPostImage(
              { format: draft.data?.format || 'feed', slide, brand },
              `post-${variation.position + 1}`
            )
          }}
          onNewBackground={async (slideIndex) => {
            setBusy(true)
            try {
              const response = await socialPostsService.regenerateBackground(
                variation.id,
                slideIndex
              )
              setVariation(response.data)
            } finally {
              setBusy(false)
            }
          }}
          slideCount={draft.data.slideCount}
          variation={variation}
        />
      )}
    </AppContentLayout>
  )
}
