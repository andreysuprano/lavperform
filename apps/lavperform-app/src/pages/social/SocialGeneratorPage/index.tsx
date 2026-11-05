import { Box, Flex, Text } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  SocialMediaLibrary,
  SocialPostWizard,
  type WizardSnapshot,
} from '@/components/features/social-posts'
import {
  type LibraryFilter,
  normalizeLibraryPost,
  reopenStep,
} from '@/components/features/social-posts/postLibrary'
import { useAuth } from '@/context/AuthContext'
import { useSocialDrafts } from '@/hooks/queries/useSocialPosts'
import { queryKeys } from '@/lib/react-query'
import { apiErrorMessage, socialPostsService } from '@/services'
import type { SocialLibraryPost } from '@/types'

interface ToastState {
  title: string
  body: string
  draftId: string
}

export function SocialGeneratorPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? ''
  const drafts = useSocialDrafts(companyId)
  const [filter, setFilter] = useState<LibraryFilter>('todos')
  const [wizard, setWizard] = useState<null | { post?: SocialLibraryPost; step: 1 | 2 | 3 | 4 }>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const seen = useRef<Map<string, string>>(new Map())
  const ready = useRef(false)

  useEffect(() => {
    if (!drafts.isSuccess) return
    const posts = drafts.data ?? []
    if (!ready.current) {
      posts.forEach((post) => seen.current.set(post.id, post.status))
      ready.current = true
      return
    }
    for (const post of posts) {
      const previous = seen.current.get(post.id)
      if (previous === 'gerando' && post.status === 'gerado') {
        setToast({
          title: 'Post pronto!',
          body: `“${post.headline || post.theme}” já pode ser visto.`,
          draftId: post.id,
        })
      }
      seen.current.set(post.id, post.status)
    }
  }, [drafts.data, drafts.isSuccess])

  const persist = async (snapshot: WizardSnapshot) => {
    const payload = {
      companyId,
      objective: snapshot.objective,
      theme: snapshot.theme.trim() || 'Rascunho',
      format: snapshot.format,
      artStyle: 'fotografico_clean',
      includeCaption: true,
      tone: snapshot.tone,
      wizardStep: snapshot.wizardStep,
      placement: snapshot.placement,
      creativeFreedom: snapshot.creativeFreedom,
      mediaIds: snapshot.mediaIds,
    }
    if (snapshot.id) {
      const updated = await socialPostsService.updateDraft(snapshot.id, payload)
      return normalizeLibraryPost(updated.data)
    }
    const created = await socialPostsService.createDraft(payload)
    return normalizeLibraryPost({
      ...payload,
      id: created.data.id,
      createdAt: created.data.createdAt,
      updatedAt: created.data.updatedAt,
      status: 'rascunho',
      variationCount: 0,
    })
  }

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.company.socialDrafts(companyId),
    })

  const saveAndClose = async (snapshot: WizardSnapshot | null) => {
    setWizard(null)
    if (!snapshot || snapshot.theme.trim().length < 1) return
    try {
      await persist(snapshot)
      await refresh()
    } catch (error) {
      setToast({
        title: 'Não salvou o rascunho',
        body: apiErrorMessage(error, 'Tente de novo.'),
        draftId: '',
      })
    }
  }

  const generate = async (snapshot: WizardSnapshot) => {
    setWizard(null)
    try {
      const saved = await persist({ ...snapshot, wizardStep: 4 })
      const generating = {
        ...saved,
        status: 'gerando' as const,
        generationStatus: 'generating',
        updatedAt: new Date().toISOString(),
      }
      seen.current.set(saved.id, 'gerando')
      queryClient.setQueryData<SocialLibraryPost[]>(
        queryKeys.company.socialDrafts(companyId),
        (current) => [generating, ...(current ?? []).filter((item) => item.id !== saved.id)]
      )
      await socialPostsService.startGeneration(saved.id, {
        creativeFreedom: snapshot.creativeFreedom,
        mediaIds: snapshot.mediaIds,
      })
      await refresh()
    } catch (error) {
      setToast({
        title: 'Não foi possível gerar',
        body: apiErrorMessage(error, 'Tente de novo.'),
        draftId: '',
      })
    }
  }

  return (
    <Box pb={{ base: 16, md: 0 }}>
      <SocialMediaLibrary
        filter={filter}
        onCreate={() => setWizard({ step: 1 })}
        onEdit={(post) => setWizard({ post, step: 1 })}
        onFilter={setFilter}
        onOpen={(post) => {
          if (post.status === 'rascunho' || post.status === 'falhou') {
            setWizard({ post, step: reopenStep(post) })
            return
          }
          navigate(`/social/generator/${post.id}`)
        }}
        onSchedule={(post) => navigate(`/social/generator/${post.id}?agendar=1`)}
        onView={(post) => navigate(`/social/generator/${post.id}`)}
        posts={drafts.data ?? []}
      />
      <SocialPostWizard
        companyId={companyId}
        initial={
          wizard?.post
            ? {
                id: wizard.post.id,
                objective: wizard.post.objective,
                theme: wizard.post.theme,
                placement: wizard.post.placement,
                format: wizard.post.format,
                tone: wizard.post.tone ?? 'Amigável',
                creativeFreedom: wizard.post.creativeFreedom,
                wizardStep: wizard.step,
                mediaIds: wizard.post.media?.map((item) => item.id) ?? [],
                media: wizard.post.media?.map((item) => ({
                  id: item.id,
                  url: item.url,
                  name: item.name ?? 'foto',
                })),
              }
            : undefined
        }
        onClose={(snapshot) => void saveAndClose(snapshot)}
        onGenerate={(snapshot) => void generate(snapshot)}
        open={Boolean(wizard)}
        step={wizard?.step ?? 1}
      />
      {toast && (
        <Flex
          align="center"
          bg="#18181B"
          borderRadius="12px"
          bottom={{ base: '88px', md: '24px' }}
          boxShadow="0 12px 15px rgba(0,0,0,0.27)"
          color="white"
          data-testid="post-ready-toast"
          gap={3}
          maxW="389px"
          position="fixed"
          px="20px"
          py={4}
          right={{ base: 4, md: 6 }}
          zIndex={40}
        >
          <Box flex="1">
            <Text fontSize="14px" fontWeight="semibold">
              {toast.title}
            </Text>
            <Text fontSize="12px" opacity={0.8}>
              {toast.body}
            </Text>
          </Box>
          {toast.draftId ? (
            <Box
              as="button"
              color="#7BC9F1"
              data-testid="post-ready-view"
              fontSize="14px"
              fontWeight="semibold"
              onClick={() => {
                const id = toast.draftId
                setToast(null)
                navigate(`/social/generator/${id}`)
              }}
              type="button"
            >
              Ver post
            </Box>
          ) : null}
        </Flex>
      )}
    </Box>
  )
}
