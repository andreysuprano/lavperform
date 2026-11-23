import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Field,
  Flex,
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
  title: string
  idLabel: string
  codeLabel: string
  codePlaceholder: string
  removeLabel: string
  invalidMessage: string
  savedToast: { title: string; description: string }
  removedToast: { title: string; description: string }
  parse: (raw: string) => string | null
  load: (companyId: string) => Promise<TrackingRecord>
  save: (companyId: string, body: TrackingCodeBody) => Promise<TrackingRecord>
  remove: (companyId: string) => Promise<void>
}

function TrackingCodeForm({
  companyId,
  queryKey,
  title,
  idLabel,
  codeLabel,
  codePlaceholder,
  removeLabel,
  invalidMessage,
  savedToast,
  removedToast,
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

  const savedEnabled = Boolean(query.data?.enabled)

  return (
    <Card.Root>
      <Card.Header>
        <Flex
          align="center"
          gap={3}
          justify="space-between"
          wrap="wrap"
        >
          <Card.Title>{title}</Card.Title>
          {savedId ? (
            <Badge colorPalette={savedEnabled ? 'green' : 'orange'}>
              {savedEnabled ? 'Medição ligada' : 'Medição pausada'}
            </Badge>
          ) : (
            <Badge colorPalette="gray">Não conectado</Badge>
          )}
        </Flex>
      </Card.Header>
      <Card.Body>
        <Stack gap={5}>
          {savedId && (
            <Flex
              align="center"
              bg="bg.muted"
              borderRadius="md"
              gap={2}
              px={3}
              py={2}
              wrap="wrap"
            >
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {idLabel} conectado
              </Text>
              <Code>{savedId}</Code>
            </Flex>
          )}
          <Field.Root invalid={Boolean(error)}>
            <Field.Label>{codeLabel}</Field.Label>
            <Textarea
              fontFamily="mono"
              fontSize="xs"
              onChange={(event) => {
                setCode(event.target.value)
                setError(null)
              }}
              placeholder={codePlaceholder}
              rows={8}
              value={code}
            />
            {error ? (
              <Field.ErrorText>{error}</Field.ErrorText>
            ) : (
              <Field.HelperText>
                {savedId
                  ? 'Cole um novo código só se quiser trocar o atual.'
                  : 'Cole o código inteiro, do jeito que você copiou.'}
              </Field.HelperText>
            )}
          </Field.Root>
          <Box
            borderRadius="md"
            borderWidth="1px"
            p={3}
          >
            <Switch.Root
              checked={enabled}
              justifyContent="space-between"
              onCheckedChange={({ checked }) => setEnabledOverride(checked)}
              w="full"
            >
              <Switch.Label fontWeight="medium">Medir páginas</Switch.Label>
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
            <Text
              color="fg.muted"
              fontSize="sm"
              mt={1}
            >
              A landing publicada e as páginas de Minhas páginas enviam os
              eventos enquanto estiver ligado.
            </Text>
          </Box>
        </Stack>
      </Card.Body>
      <Card.Footer>
        <Button
          loading={saving}
          onClick={handleSave}
        >
          Salvar
        </Button>
        {savedId && (
          <Button
            colorPalette="red"
            loading={removing}
            onClick={handleRemove}
            variant="outline"
          >
            {removeLabel}
          </Button>
        )}
      </Card.Footer>
    </Card.Root>
  )
}

export { TrackingCodeForm }
