import { Box, Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuSparkles } from 'react-icons/lu'
import { useParams } from 'react-router-dom'

import { AppContentLayout, LoadingState, PostRevisionStudio, ReviewSchedule, SocialPhoneLinks } from '@/components'
import { downloadPostImage } from '@/components/features/social-posts/exportPost'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import { useBrandIdentity, useSocialDraft } from '@/hooks/queries/useSocialPosts'
import { apiErrorMessage, socialPostsService } from '@/services'
import type { PostVariation, PostVersion } from '@/types'
import { captionWithHashtags, DEFAULT_BRAND } from '@/types'

export function SocialRevisionPage() {
  const { draftId = '' } = useParams()
  const { selectedCompany } = useAuth()
  const brand = useBrandIdentity(selectedCompany?.id)
  const draft = useSocialDraft(draftId)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPrompt, setLastPrompt] = useState('')

  const identity = brand.data ?? {
    ...DEFAULT_BRAND,
    id: null,
    companyId: selectedCompany?.id ?? '',
    persisted: false,
  }

  const run = async (task: () => Promise<unknown>) => {
    setPending(true)
    setError(null)
    try {
      await task()
      await draft.refetch()
    } catch (caught) {
      setError(
        apiErrorMessage(
          caught,
          'Não consegui gerar a nova versão. A versão anterior continua disponível.'
        )
      )
    } finally {
      setPending(false)
    }
  }

  const current = useMemo(() => {
    const variations = draft.data?.variations ?? []
    return (
      variations.find((item) => item.id === draft.data?.selectedVariationId) ??
      variations[0]
    )
  }, [draft.data])

  const revise = (variationId: string, prompt: string) => {
    setLastPrompt(prompt)
    return run(() => socialPostsService.revise(variationId, prompt))
  }

  return (
    <AppContentLayout
      icon={<LuSparkles />}
      iconBg="#E6F5FD"
      title="Revisar post"
    >
      {draft.isLoading || !draft.data ? (
        <LoadingState title="Abrindo revisão..." />
      ) : (
        <Box
          alignItems="start"
          display="grid"
          gap={4}
          gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 420px' }}
        >
        <PostRevisionStudio
          brand={identity}
          draft={draft.data}
          error={error}
          onCopy={async (version) => {
            await navigator.clipboard.writeText(
              captionWithHashtags(version as unknown as PostVariation)
            )
            toaster.create({ title: 'Legenda copiada', type: 'success' })
          }}
          onDownload={async (_variation, version: PostVersion) => {
            const slide = version.slides[0]
            if (!slide) return
            await downloadPostImage(
              { format: draft.data?.format || 'feed', slide, brand: identity },
              `post-v${version.number}`
            )
          }}
          onRestoreVersion={(variationId, versionId) =>
            run(() => socialPostsService.restoreVersion(variationId, versionId))
          }
          onRetry={() => {
            const current = draft.data?.selectedVariationId
            if (current && lastPrompt) revise(current, lastPrompt)
          }}
          onRevise={revise}
          onSelectVariation={(variationId) =>
            run(() => socialPostsService.selectVariation(draftId, variationId))
          }
          onSelectVersion={(variationId, versionId) =>
            run(() => socialPostsService.selectVersion(variationId, versionId))
          }
          pending={pending}
        />
        <Stack gap={4}>
          <SocialPhoneLinks />
          <ReviewSchedule
            caption={current ? captionWithHashtags(current) : ''}
            companyId={selectedCompany?.id ?? ''}
            draftId={draft.data.id}
            headline={current?.headline}
            imageDataUrl={current?.slides[0]?.backgroundImage ?? undefined}
            variationId={current?.id}
          />
        </Stack>
        </Box>
      )}
    </AppContentLayout>
  )
}
