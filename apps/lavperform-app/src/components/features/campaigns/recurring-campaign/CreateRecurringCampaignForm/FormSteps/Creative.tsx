import { Box, Button, Field, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuPlus } from 'react-icons/lu'

import { Empty } from '@/components'
import {
  CHANNEL_CATALOG,
  type ChannelKey,
} from '@/components/features/channels/channelCatalog.constants'

import { getWizardFormId } from '../../wizardFormId'
import type {
  CampaignCreative,
  CreativeStepSubmitPayload,
  FormStepsProps,
} from './FormSteps.types'
import { CreativeCard } from './CreativeCard'
import { CreativeForm } from './CreativeForm'

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resolveDescriptionMaxLength(channelKeys: ChannelKey[]) {
  let max = 500
  for (const key of channelKeys) {
    const item = CHANNEL_CATALOG.find((c) => c.key === key)
    if (item?.creativeDescriptionMaxChars != null) {
      max = Math.min(max, item.creativeDescriptionMaxChars)
    }
  }
  return max
}

function mergeCreativeUpdate(
  current: CampaignCreative,
  partial: Omit<CampaignCreative, 'id'>
): CampaignCreative {
  return {
    ...current,
    ...partial,
    imageUrls: partial.imageUrls ?? [],
    image: partial.image ?? null,
    imageBase64List: partial.imageBase64List,
  }
}

export function Creative(props: FormStepsProps) {
  const {
    formData,
    id,
    onSubmit,
    onCreativesChange,
    onEditingStateChange,
    wizardContext,
  } = props
  const isEdit = wizardContext === 'edit'

  const selectedChannels = formData?.channels ?? []

  const allowImage = useMemo(() => {
    if (selectedChannels.length === 0) return true
    return !selectedChannels.some(
      (key) => CHANNEL_CATALOG.find((c) => c.key === key)?.supportsImage === false
    )
  }, [selectedChannels])

  const descriptionMaxLength = useMemo(
    () => resolveDescriptionMaxLength(selectedChannels),
    [selectedChannels]
  )

  const parentCreatives = formData?.creatives ?? []
  const creativesRef = useRef<CampaignCreative[]>(parentCreatives)
  const [creatives, setCreatives] = useState<CampaignCreative[]>(
    () => parentCreatives
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const applyCreatives = useCallback(
    (next: CampaignCreative[], syncParent = false) => {
      creativesRef.current = next
      setCreatives(next)
      if (syncParent && onCreativesChange) {
        onCreativesChange(next)
      }
    },
    [onCreativesChange]
  )

  const parentCreativesKey = useMemo(
    () => parentCreatives.map((c) => c.id).join('|'),
    [parentCreatives]
  )
  const lastParentKeyRef = useRef(parentCreativesKey)
  const creativesDirtyRef = useRef(false)

  useEffect(() => {
    if (creativesDirtyRef.current || isFormOpen) return
    if (lastParentKeyRef.current === parentCreativesKey) return

    lastParentKeyRef.current = parentCreativesKey
    applyCreatives(parentCreatives)
  }, [applyCreatives, isFormOpen, parentCreatives, parentCreativesKey])

  useEffect(() => {
    onEditingStateChange?.(isFormOpen)
  }, [isFormOpen, onEditingStateChange])

  const editingCreative = useMemo(() => {
    if (!editingId) return null
    return creatives.find((c) => c.id === editingId) ?? null
  }, [creatives, editingId])

  const handleCreateOrUpdate = useCallback(
    (partial: Omit<CampaignCreative, 'id'>) => {
      const next = editingId
        ? creativesRef.current.map((c) =>
            c.id === editingId ? mergeCreativeUpdate(c, partial) : c
          )
        : [...creativesRef.current, { id: createId(), ...partial }]

      creativesDirtyRef.current = true
      applyCreatives(next, !!onCreativesChange)
      setEditingId(null)
      setIsFormOpen(false)
      setError(null)
    },
    [applyCreatives, editingId, onCreativesChange]
  )

  const handleEdit = useCallback((creativeId: string) => {
    setEditingId(creativeId)
    setIsFormOpen(true)
  }, [])

  const handleDelete = useCallback(
    (creativeId: string) => {
      const next = creativesRef.current.filter((c) => c.id !== creativeId)
      creativesDirtyRef.current = true
      applyCreatives(next, !!onCreativesChange)
      setEditingId((prev) => (prev === creativeId ? null : prev))
    },
    [applyCreatives, onCreativesChange]
  )

  useEffect(() => {
    if (!allowImage) {
      const prev = creativesRef.current
      if (
        !prev.some(
          (c) =>
            c.image ||
            (c.imageUrls?.length ?? 0) > 0 ||
            (c.imageBase64List?.length ?? 0) > 0
        )
      ) {
        return
      }
      const next = prev.map((c) => ({
        ...c,
        image: null,
        imageUrls: [],
        imageBase64List: undefined,
      }))
      creativesDirtyRef.current = true
      applyCreatives(next, !!onCreativesChange)
    }
  }, [allowImage, applyCreatives, onCreativesChange])

  const introText = useMemo(() => {
    const baseEdit = 'Ajuste os criativos desta campanha.'
    const baseCreate = 'Crie um ou mais criativos para a campanha.'
    const base = isEdit ? baseEdit : baseCreate
    const fields = allowImage
      ? ' Cada criativo pode ter imagens, título, descrição e link. Imagens são opcionais.'
      : ' O canal selecionado não permite imagem: use título, descrição e link.'
    const shortDescriptionLimit =
      descriptionMaxLength < 500
        ? ` A descrição fica limitada a ${descriptionMaxLength} caracteres conforme o canal selecionado.`
        : ''
    return `${base}${fields}${shortDescriptionLimit}`
  }, [allowImage, descriptionMaxLength, isEdit])

  return (
    <Stack
      as="form"
      gap={4}
      id={getWizardFormId(props.wizardFormId ?? 'campaign', id ?? 0)}
      onSubmit={(e) => {
        e.preventDefault()
        if (isFormOpen) {
          setError(
            'Salve ou cancele o criativo em edição antes de avançar para a próxima etapa.'
          )
          return
        }
        if (creativesRef.current.length < 1) {
          setError('Você deve adicionar pelo menos 1 criativo.')
          return
        }
        setError(null)
        const payload: CreativeStepSubmitPayload = {
          creatives: creativesRef.current,
        }
        onSubmit?.(payload)
      }}
    >
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        {introText}
      </Text>

      <Stack gap={4}>
        <HStack justify="space-between">
          <Stack gap={0}>
            <Text fontWeight="medium">Criativos da campanha</Text>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              {creatives.length} item(ns)
            </Text>
          </Stack>
          {creatives.length > 0 && (
            <Button
              onClick={() => {
                setEditingId(null)
                setIsFormOpen(true)
              }}
              size="sm"
              variant="surface"
            >
              <LuPlus />
              Criativo
            </Button>
          )}
        </HStack>

        {isFormOpen && (
          <Box>
            <CreativeForm
              key={`${editingId ?? 'new'}-${descriptionMaxLength}-${allowImage}`}
              allowImage={allowImage}
              descriptionMaxLength={descriptionMaxLength}
              initialCreative={editingCreative}
              isEditing={!!editingId}
              onCancel={() => {
                setEditingId(null)
                setIsFormOpen(false)
              }}
              onSubmit={handleCreateOrUpdate}
            />
          </Box>
        )}

        {creatives.length > 0 ? (
          <SimpleGrid
            columns={{ base: 1, md: 2, xl: 3 }}
            gap={3}
            w="full"
          >
            {creatives.map((c) => (
              <CreativeCard
                creative={c}
                key={c.id}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Stack
            alignItems="center"
            gap={3}
            py={6}
          >
            <Empty
              description="Crie seu primeiro criativo para continuar."
              title="Nenhum criativo adicionado"
            />
            <Button
              onClick={() => {
                setEditingId(null)
                setIsFormOpen(true)
              }}
              size="sm"
              variant="surface"
            >
              <LuPlus />
              Criar primeiro criativo
            </Button>
          </Stack>
        )}

        <Field.Root invalid={!!error}>
          {!!error && <Field.ErrorText>{error}</Field.ErrorText>}
        </Field.Root>
      </Stack>
    </Stack>
  )
}
