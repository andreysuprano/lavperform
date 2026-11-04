import { Button, Dialog, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuSparkles } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'

import { AppContentLayout, PostBriefingForm } from '@/components'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import {
  useBrandIdentity,
  useCreateSocialDraft,
  useSocialDrafts,
} from '@/hooks/queries/useSocialPosts'
import { apiErrorMessage, socialPostsService } from '@/services'
import type { CreateDraftPayload } from '@/types'

const EMPTY_BRIEFING = (companyId: string): CreateDraftPayload => ({
  companyId,
  objective: 'promocao',
  theme: '',
  format: 'feed',
  slideCount: 1,
  artStyle: 'fotografico_clean',
  includeCaption: true,
})

export function SocialGeneratorPage() {
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? ''
  const brand = useBrandIdentity(companyId)
  const drafts = useSocialDrafts(companyId)
  const createDraft = useCreateSocialDraft()
  const [form, setForm] = useState<CreateDraftPayload>(
    EMPTY_BRIEFING(companyId)
  )
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const generate = async () => {
    if (!companyId) return
    setGenerating(true)
    setGenerationError(null)
    try {
      const created = await createDraft.mutateAsync({ ...form, companyId })
      const generated = await socialPostsService.generate(created.id)
      toaster.create({ title: 'Variações prontas', type: 'success' })
      navigate(`/social/generator/${generated.data.id}`)
    } catch (error) {
      const message = apiErrorMessage(
        error,
        'Não foi possível gerar as variações. Tente de novo.'
      )
      setGenerationError(message)
      toaster.create({ title: message, type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const brandNotice =
    brand.data && !brand.data.persisted
      ? 'A identidade da marca ainda não foi salva. A IA usa cores e tom padrão até você salvar logo, cores, fontes e tom de voz em Ajustes.'
      : null

  return (
    <AppContentLayout
      action={
        <Button
          onClick={() => setDraftsOpen(true)}
          variant="outline"
        >
          Meus rascunhos ({drafts.data?.length ?? 0})
        </Button>
      }
      icon={<LuSparkles />}
      title="Gerador de posts"
    >
      <PostBriefingForm
        brand={brand.data}
        error={generationError}
        generating={generating}
        notice={brandNotice}
        onChange={setForm}
        onGenerate={generate}
        value={{ ...form, companyId }}
      />
      <Dialog.Root
        onOpenChange={(details) => setDraftsOpen(details.open)}
        open={draftsOpen}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Meus rascunhos</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={2}>
                {(drafts.data ?? []).length === 0 && (
                  <Text color="fg.muted">Nenhum rascunho ainda.</Text>
                )}
                {(drafts.data ?? []).map((draft) => (
                  <Button
                    justifyContent="flex-start"
                    key={draft.id}
                    onClick={() => {
                      setDraftsOpen(false)
                      navigate(
                        draft.variationCount
                          ? `/social/generator/${draft.id}`
                          : '/social/generator'
                      )
                    }}
                    variant="ghost"
                  >
                    {draft.headline || draft.theme}
                  </Button>
                ))}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </AppContentLayout>
  )
}
