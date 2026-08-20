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
import { RiAddLine, RiListCheck } from 'react-icons/ri'

import { AppContentLayout, Empty, LoadingState } from '@/components'
import {
  CustomSendListBuilder,
  CustomSendListCard,
} from '@/components/features/custom-send-lists'
import { useAuth } from '@/context/AuthContext'
import {
  useCustomSendLists,
  useDeleteCustomSendList,
} from '@/hooks/queries/useCustomSendLists'
import type { CustomSendList } from '@/types'

export function CustomSendListsPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const { data, isLoading } = useCustomSendLists(companyId, { page: 1, limit: 50 })
  const deleteList = useDeleteCustomSendList()

  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedList, setSelectedList] = useState<CustomSendList | undefined>()
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

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

  const lists = useMemo(() => data?.data ?? [], [data])

  const totals = useMemo(() => {
    const listCount = lists.length
    const customers = lists.reduce(
      (sum, list) => sum + (list.memberCount ?? 0),
      0,
    )
    return { listCount, customers }
  }, [lists])

  const openCreate = () => {
    setSelectedList(undefined)
    setEditorOpen(true)
  }

  const openEdit = (list: CustomSendList) => {
    setSelectedList(list)
    setEditorOpen(true)
  }

  const handleDelete = async (list: CustomSendList) => {
    if (!companyId) return
    setDeletingListId(list.id)
    try {
      await deleteList.mutateAsync({ companyId, listId: list.id })
    } finally {
      setDeletingListId(null)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <AppContentLayout
      action={
        <Button ml="auto" onClick={openCreate}>
          <RiAddLine />
          Nova lista
        </Button>
      }
      icon={<RiListCheck />}
      title="Listas personalizadas"
    >
      <Stack gap={6}>
        <Text color="fg.muted">
          Crie listas com clientes selecionados manualmente para usar nos disparos.
        </Text>

        {lists.length === 0 ? (
          <Stack align="center" gap={4} py={8}>
            <Empty
              description="Monte a primeira lista escolhendo clientes da sua base."
              icon={RiListCheck}
              title="Ainda não há listas personalizadas"
            />
            <Button onClick={openCreate}>Criar primeira lista</Button>
          </Stack>
        ) : (
          <Stack gap={4}>
            <HStack color="fg.muted" flexWrap="wrap" fontSize="sm" gap={2}>
              <Text fontWeight="medium">
                {totals.listCount}{' '}
                {totals.listCount === 1 ? 'lista' : 'listas'}
              </Text>
              <Text>·</Text>
              <Text fontWeight="medium">
                {totals.customers}{' '}
                {totals.customers === 1 ? 'cliente' : 'clientes'} no total
              </Text>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
              {lists.map((list) => (
                <CustomSendListCard
                  isDeleting={deletingListId === list.id}
                  key={list.id}
                  list={list}
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
              <Dialog.Header flexShrink={0} pe={10}>
                <Stack gap={1}>
                  <Dialog.Title>
                    {selectedList ? 'Editar lista' : 'Nova lista personalizada'}
                  </Dialog.Title>
                  <Text color="fg.muted" fontSize="sm">
                    Selecione os clientes que farão parte desta lista de envio.
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
                <CustomSendListBuilder
                  list={selectedList}
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
