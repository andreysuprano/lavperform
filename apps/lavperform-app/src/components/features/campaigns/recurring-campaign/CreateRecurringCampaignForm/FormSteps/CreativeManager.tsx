import { HStack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'

import type { CampaignCreative } from './FormSteps.types'

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type Props = {
  initialCreatives?: CampaignCreative[]
  renderForm: (args: {
    editingCreative: CampaignCreative | null
    isEditing: boolean
    onSubmit: (creative: Omit<CampaignCreative, 'id'>) => void
    onCancel: () => void
  }) => React.ReactNode
  renderList: (args: {
    creatives: CampaignCreative[]
    onEdit: (id: string) => void
    onDelete: (id: string) => void
  }) => React.ReactNode
}

export function CreativeManager({
  initialCreatives,
  renderForm,
  renderList,
}: Props) {
  const [creatives, setCreatives] = useState<CampaignCreative[]>(
    initialCreatives ?? []
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingCreative = useMemo(() => {
    if (!editingId) return null
    return creatives.find((c) => c.id === editingId) ?? null
  }, [creatives, editingId])

  const onEdit = useCallback((id: string) => setEditingId(id), [])

  const onCancel = useCallback(() => setEditingId(null), [])

  const onDelete = useCallback((id: string) => {
    setCreatives((prev) => prev.filter((c) => c.id !== id))
    setEditingId((prev) => (prev === id ? null : prev))
  }, [])

  const onSubmit = useCallback(
    (creative: Omit<CampaignCreative, 'id'>) => {
      setCreatives((prev) => {
        if (editingId) {
          return prev.map((c) => (c.id === editingId ? { ...c, ...creative } : c))
        }
        return [...prev, { id: createId(), ...creative }]
      })
      setEditingId(null)
    },
    [editingId]
  )

  return (
    <HStack
      align="stretch"
      gap={6}
      justify="space-between"
      w="full"
    >
      {renderForm({
        editingCreative,
        isEditing: !!editingId,
        onSubmit,
        onCancel,
      })}
      {renderList({ creatives, onEdit, onDelete })}
    </HStack>
  )
}
