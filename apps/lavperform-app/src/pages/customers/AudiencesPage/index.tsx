import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { RiAddLine, RiGroupLine } from 'react-icons/ri'

import { AppContentLayout, Empty, LoadingState } from '@/components'
import { AudienceBuilder, AudienceCard } from '@/components/features/audiences'
import { useAuth } from '@/context/AuthContext'
import { useAudiences, useDeleteAudience } from '@/hooks/queries/useAudiences'
import type { Audience } from '@/types'

export function AudiencesPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const { data, isLoading } = useAudiences(companyId, { page: 1, limit: 50 })
  const deleteAudience = useDeleteAudience()

  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedAudience, setSelectedAudience] = useState<Audience | undefined>()
  const [deletingAudienceId, setDeletingAudienceId] = useState<string | null>(null)

  useEffect(() => {
    const scrollContainer = document.getElementById('app-scroll-container')
    if (editorOpen) {
      document.body.style.overflow = 'hidden'
      if (scrollContainer) scrollContainer.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      if (scrollContainer) scrollContainer.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      if (scrollContainer) scrollContainer.style.overflow = ''
    }
  }, [editorOpen])

  const audiences = data?.data ?? []

  const totals = useMemo(() => {
    const lists = audiences.length
    const customers = audiences.reduce(
      (sum, audience) => sum + (audience.customerCount ?? 0),
      0,
    )
    return { lists, customers }
  }, [audiences])

  const openCreate = () => {
    setSelectedAudience(undefined)
    setEditorOpen(true)
  }

  const openEdit = (audience: Audience) => {
    setSelectedAudience(audience)
    setEditorOpen(true)
  }

  const handleDelete = async (audience: Audience) => {
    if (!companyId) return
    setDeletingAudienceId(audience.id)
    try {
      await deleteAudience.mutateAsync({ companyId, audienceId: audience.id })
    } finally {
      setDeletingAudienceId(null)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <AppContentLayout
      action={
        <Button
          ml="auto"
          onClick={openCreate}
        >
          <RiAddLine />
          Nova audiência
        </Button>
      }
      icon={<RiGroupLine />}
      title="Audiências"
    >
      <Stack gap={6}>
        <Text color="fg.muted">
          Crie listas de clientes para usar nas suas campanhas.
        </Text>

        {audiences.length === 0 ? (
          <Stack
            align="center"
            gap={4}
            py={8}
          >
            <Empty
              description="Monte a primeira lista para escolher quem recebe suas campanhas."
              icon={RiGroupLine}
              title="Ainda não há audiências"
            />
            <Button onClick={openCreate}>Criar primeira audiência</Button>
          </Stack>
        ) : (
          <Stack gap={4}>
            <HStack
              color="fg.muted"
              flexWrap="wrap"
              fontSize="sm"
              gap={2}
            >
              <Text fontWeight="medium">
                {totals.lists}{' '}
                {totals.lists === 1 ? 'lista' : 'listas'}
              </Text>
              <Text>·</Text>
              <Text fontWeight="medium">
                {totals.customers}{' '}
                {totals.customers === 1 ? 'cliente' : 'clientes'} no total
              </Text>
            </HStack>

            <SimpleGrid
              columns={{ base: 1, md: 2, xl: 3 }}
              gap={4}
            >
              {audiences.map((audience) => (
                <AudienceCard
                  audience={audience}
                  isDeleting={deletingAudienceId === audience.id}
                  key={audience.id}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                />
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Stack>

      <Dialog.Root
        onOpenChange={(details) => setEditorOpen(details.open)}
        open={editorOpen}
        size="xl"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner overflow="hidden">
            <Dialog.Content
              display="flex"
              flexDirection="column"
              maxH="90dvh"
              overflow="hidden"
              position="relative"
              w="full"
            >
              <Dialog.CloseTrigger asChild>
                <CloseButton
                  aria-label="Fechar"
                  position="absolute"
                  right={3}
                  top={3}
                  variant="subtle"
                  zIndex={10}
                />
              </Dialog.CloseTrigger>
              <Dialog.Header
                flexShrink={0}
                pe={10}
              >
                <Stack gap={1}>
                  <Dialog.Title>
                    {selectedAudience ? 'Editar audiência' : 'Nova audiência'}
                  </Dialog.Title>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                  >
                    {selectedAudience
                      ? 'Ajuste os filtros e veja quem entra na lista.'
                      : 'Vamos montar juntos quem deve entrar nessa lista.'}
                  </Text>
                </Stack>
              </Dialog.Header>
              <Dialog.Body
                display="flex"
                flex={1}
                flexDirection="column"
                minH={0}
                overflow="hidden"
                pb={4}
              >
                <AudienceBuilder
                  audience={selectedAudience}
                  onCancel={() => setEditorOpen(false)}
                  onSaved={() => setEditorOpen(false)}
                />
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </AppContentLayout>
  )
}
