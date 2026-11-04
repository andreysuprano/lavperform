import {
  Button,
  Field,
  HStack,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { LoadingState } from '@/components/common/LoadingState/LoadingState'
import { toaster } from '@/components/ui/toaster'
import type { TrackingCodeBody } from '@/services/traffic.service'
import { trackingErrorMessage } from '@/utils/tracking/messages'

type TrackingRecord = {
  id: string | null
  enabled: boolean
}

type Props = {
  companyId?: string
  queryKey: readonly unknown[]
  codeLabel: string
  removeLabel: string
  invalidMessage: string
  savedToast: { title: string; description: string }
  removedToast: { title: string; description: string }
  statusLine: (id: string, enabled: boolean) => string
  parse: (raw: string) => string | null
  load: (companyId: string) => Promise<TrackingRecord>
  save: (companyId: string, body: TrackingCodeBody) => Promise<TrackingRecord>
  remove: (companyId: string) => Promise<void>
}

function TrackingCodeForm({
  companyId,
  queryKey,
  codeLabel,
  removeLabel,
  invalidMessage,
  savedToast,
  removedToast,
  statusLine,
  parse,
  load,
  save,
  remove,
}: Props) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [enabledOverride, setEnabledOverride] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const query = useQuery({
    queryKey,
    queryFn: () => load(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const savedId = query.data?.id ?? null
  const enabled =
    enabledOverride ?? (savedId ? Boolean(query.data?.enabled) : true)

  useEffect(() => {
    setEnabledOverride(null)
  }, [query.data])

  const waiting = !companyId || query.isPending

  async function handleSave() {
    if (!companyId) return
    const trimmed = code.trim()
    if (!trimmed && !savedId) {
      setError(invalidMessage)
      return
    }
    if (trimmed && !parse(trimmed)) {
      setError(invalidMessage)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const body: TrackingCodeBody = trimmed
        ? { baseCode: code, enabled }
        : { enabled }
      const saved = await save(companyId, body)
      queryClient.setQueryData(queryKey, saved)
      setCode('')
      setEnabledOverride(null)
      toaster.create({
        title: savedToast.title,
        description: savedToast.description,
        type: 'success',
        duration: 2000,
      })
    } catch (saveError) {
      setError(trackingErrorMessage(saveError, invalidMessage))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!companyId) return
    setRemoving(true)
    setError(null)
    try {
      await remove(companyId)
      const cleared = { id: null, enabled: false }
      queryClient.setQueryData(queryKey, cleared)
      setCode('')
      setEnabledOverride(null)
      toaster.create({
        title: removedToast.title,
        description: removedToast.description,
        type: 'success',
        duration: 2000,
      })
    } catch (removeError) {
      toaster.create({
        title: 'Não foi possível remover',
        description: trackingErrorMessage(
          removeError,
          'Tente de novo em instantes.'
        ),
        type: 'error',
        duration: 2000,
      })
    } finally {
      setRemoving(false)
    }
  }

  if (waiting) return <LoadingState />

  return (
    <Stack gap={4}>
      {savedId && (
        <Text>
          {statusLine(savedId, query.data?.enabled ?? enabled)}
        </Text>
      )}
      <Field.Root invalid={Boolean(error)}>
        <Field.Label>{codeLabel}</Field.Label>
        <Textarea
          rows={8}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
        />
        {error && <Field.ErrorText>{error}</Field.ErrorText>}
      </Field.Root>
      <Switch.Root
        checked={enabled}
        onCheckedChange={({ checked }) => setEnabledOverride(checked)}
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label>Medir páginas</Switch.Label>
      </Switch.Root>
      <HStack>
        <Button
          loading={saving}
          onClick={handleSave}
        >
          Salvar
        </Button>
        {savedId && (
          <Button
            loading={removing}
            onClick={handleRemove}
            variant="outline"
          >
            {removeLabel}
          </Button>
        )}
      </HStack>
    </Stack>
  )
}

export { TrackingCodeForm }
