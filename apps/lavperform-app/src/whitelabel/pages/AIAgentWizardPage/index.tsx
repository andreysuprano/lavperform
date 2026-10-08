import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { CADASTRO_KEYS, scriptFor } from '@/whitelabel/components/ai-agent/PromptStudio/sheet-script'
import { snapshotShownValue } from '@/whitelabel/components/ai-agent/PromptStudio/snapshot-shown-value'
import {
  LAUNDRY_TYPE_KEY,
  STORE_KEY,
  laundryModelFromLabel,
  nextWizardKey,
  objectiveFor,
  wizardChoice,
  wizardKeys,
  wizardProgress,
  wizardQuestion,
  wizardStepForMissing,
} from '@/whitelabel/components/ai-agent/PromptStudio/wizard-steps'
import { aiAgentService } from '@/whitelabel/services'
import type { PromptSheetResponse } from '@/whitelabel/types'

const STALE = 'O texto mudou. Peça a alteração de novo.'
const HOUR_KEYS = CADASTRO_KEYS.filter((key) => key.startsWith('hours_'))

type Props = {
  open: boolean
  onClose: () => void
}

function presetFor(key: string, sheet: PromptSheetResponse): string | null {
  if (key === 'agentName') return sheet.snapshot.name
  return snapshotShownValue(key, sheet.snapshot)
}

function storeValue(key: string, sheet: PromptSheetResponse): string {
  const saved = sheet.answers[key]?.trim()
  if (saved) return saved
  return snapshotShownValue(key, sheet.snapshot)?.trim() ?? ''
}

function AIAgentWizardModalBase({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { selectedCompany, updateCompanyFlags } = useAuth()
  const companyId = selectedCompany?.id
  const [sheet, setSheet] = useState<PromptSheetResponse | null>(null)
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [storeDraft, setStoreDraft] = useState<Record<string, string>>({})
  const [storeEditing, setStoreEditing] = useState(false)
  const [hoursTogether, setHoursTogether] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!companyId) return null
    const response = await aiAgentService.getPromptSheet(companyId)
    setSheet(response.data)
    return response.data
  }, [companyId])

  useEffect(() => {
    if (!open) return
    setReady(false)
    void load().catch(() => setNotice('Não foi possível carregar a ficha.'))
  }, [open, load])

  const keys = useMemo(() => (sheet ? wizardKeys(sheet.serviceModel) : []), [sheet])
  const key = keys[index] ?? null

  useEffect(() => {
    if (!open || !sheet || ready || keys.length === 0) return
    const next = nextWizardKey(sheet.serviceModel, {
      agentName: sheet.agentName ?? '',
      agentObjective: sheet.agentObjective ?? '',
      answers: sheet.answers,
    })
    setIndex(next ? Math.max(keys.indexOf(next), 0) : Math.max(keys.length - 1, 0))
    setReady(true)
  }, [open, sheet, ready, keys])

  const choice = sheet && key ? wizardChoice(key, sheet.serviceModel, presetFor(key, sheet)) : null
  const progress = sheet
    ? wizardProgress(sheet.serviceModel, {
        agentName: sheet.agentName ?? '',
        agentObjective: sheet.agentObjective ?? '',
        answers: sheet.answers,
      })
    : { answered: 0, total: 1 }

  const fields = sheet ? scriptFor(sheet.serviceModel) : []
  const labelFor = (fieldKey: string) => fields.find((field) => field.key === fieldKey)?.label ?? fieldKey

  useEffect(() => {
    if (!sheet || key !== STORE_KEY) return
    const draft = Object.fromEntries(CADASTRO_KEYS.map((cadastroKey) => [cadastroKey, storeValue(cadastroKey, sheet)]))
    setStoreDraft(draft)
    const identityMissing = CADASTRO_KEYS.some(
      (cadastroKey) => !cadastroKey.startsWith('hours_') && draft[cadastroKey].trim() === ''
    )
    setStoreEditing(identityMissing)
    setHoursTogether(HOUR_KEYS.every((hourKey) => draft[hourKey].trim() === ''))
  }, [key, sheet])

  const currentValue = () => {
    if (!sheet || !key) return ''
    if (key === 'agentName') return sheet.agentName ?? ''
    if (key === LAUNDRY_TYPE_KEY) {
      return sheet.serviceModel === 'SELF_SERVICE' ? 'Auto serviço' : 'Convencional'
    }
    return sheet.answers[key] ?? ''
  }

  useEffect(() => {
    if (key === STORE_KEY) return
    const value = currentValue()
    if (!choice) return
    if (choice.options.includes(value)) {
      setSelected(value)
      setOtherOpen(false)
      setOtherText('')
      return
    }
    if (value.trim() !== '') {
      setSelected(null)
      setOtherOpen(true)
      setOtherText(value)
      return
    }
    setSelected(null)
    setOtherOpen(choice.textOnly)
    setOtherText('')
  }, [key, sheet, choice?.textOnly])

  const storeComplete = CADASTRO_KEYS.every((cadastroKey) => (storeDraft[cadastroKey] ?? '').trim() !== '')

  const answerValue = () => {
    if (key === STORE_KEY) return storeComplete ? 'ok' : ''
    if (otherOpen || choice?.textOnly) return otherText.trim()
    return selected?.trim() ?? ''
  }

  const goNext = (fresh: PromptSheetResponse) => {
    const next = nextWizardKey(fresh.serviceModel, {
      agentName: fresh.agentName ?? '',
      agentObjective: fresh.agentObjective ?? '',
      answers: fresh.answers,
    })
    if (!next) return false
    setIndex(wizardKeys(fresh.serviceModel).indexOf(next))
    return true
  }

  const save = async () => {
    if (!companyId || !sheet || !key) return
    const value = answerValue()
    if (!value) return
    setBusy(true)
    setNotice(null)
    try {
      if (key === LAUNDRY_TYPE_KEY) {
        const model = laundryModelFromLabel(selected ?? '')
        if (!model) return
        await aiAgentService.putPromptSheetIntro(companyId, {
          agentObjective: objectiveFor(model),
          serviceModel: model,
          sheetUpdatedAt: sheet.updatedAt ?? undefined,
        })
        updateCompanyFlags(companyId, { serviceModel: model })
      } else if (key === STORE_KEY) {
        let updatedAt = sheet.updatedAt ?? undefined
        for (const cadastroKey of CADASTRO_KEYS) {
          const response = await aiAgentService.putPromptSheetAnswer(companyId, {
            key: cadastroKey,
            value: storeDraft[cadastroKey].trim(),
            sheetUpdatedAt: updatedAt,
          })
          updatedAt = response.data.updatedAt
        }
      } else if (key === 'agentName') {
        await aiAgentService.putPromptSheetIntro(companyId, {
          agentName: value,
          sheetUpdatedAt: sheet.updatedAt ?? undefined,
        })
      } else {
        await aiAgentService.putPromptSheetAnswer(companyId, {
          key,
          value,
          sheetUpdatedAt: sheet.updatedAt ?? undefined,
        })
      }
      const fresh = await load()
      if (!fresh) return
      if (!goNext(fresh)) {
        const created = await aiAgentService.finishWizard(companyId)
        onClose()
        navigate(`/whitelabel/ai-agent/${created.data.id}`)
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; missing?: string[] }>
      if (axiosError.response?.status === 409) {
        setNotice(STALE)
        await load()
        return
      }
      const data = axiosError.response?.data as
        | { missing?: string[]; message?: string | { missing?: string[] } }
        | undefined
      const missing = Array.isArray(data?.missing)
        ? data.missing
        : data?.message && typeof data.message === 'object'
          ? data.message.missing
          : undefined
      if (axiosError.response?.status === 400 && missing && missing.length > 0 && sheet) {
        const target = wizardKeys(sheet.serviceModel).indexOf(wizardStepForMissing(missing[0]))
        if (target >= 0) setIndex(target)
        setNotice('Falta responder uma pergunta.')
        return
      }
      setNotice('Não foi possível guardar a resposta.')
    } finally {
      setBusy(false)
    }
  }

  const identityKeys = CADASTRO_KEYS.filter((cadastroKey) => !cadastroKey.startsWith('hours_'))
  const continueLabel = key === STORE_KEY ? 'Confirmar' : index === keys.length - 1 ? 'Criar agente' : 'Continuar'

  return (
    <Dialog.Root
      open={open}
      closeOnInteractOutside={!busy}
      onOpenChange={(details) => {
        if (!details.open && !busy) onClose()
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="34rem" w="full" borderRadius="2xl" p={0} overflow="hidden">
            <Flex align="center" justify="space-between" px={6} pt={5} pb={4}>
              <Stack gap={1}>
                <Text fontSize="sm" color="fg.muted">
                  Novo agente
                </Text>
                <Text fontWeight="semibold">
                  {progress.answered} de {progress.total}
                </Text>
              </Stack>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Fechar" disabled={busy} />
              </Dialog.CloseTrigger>
            </Flex>
            <Box h="3px" bg="bg.muted">
              <Box h="full" bg="primary.500" width={`${Math.round((progress.answered / progress.total) * 100)}%`} />
            </Box>
            <Stack gap={5} px={6} py={6} maxH="62vh" overflowY="auto">
              {key && sheet && (
                <Text fontSize="xl" fontWeight="semibold" lineHeight="short">
                  {wizardQuestion(key, sheet.serviceModel)}
                </Text>
              )}
              {key === STORE_KEY && (
                <Text fontSize="sm" color="fg.muted">
                  Estes dados vêm do cadastro da loja. Confirme se estão certos.
                </Text>
              )}
              {notice && <Text color="fg.muted">{notice}</Text>}
              {key === STORE_KEY ? (
                <Stack gap={5}>
                  <StoreGroup
                    title="Loja"
                    keys={identityKeys}
                    labels={labelFor}
                    draft={storeDraft}
                    editing={storeEditing}
                    onChange={(fieldKey, value) => setStoreDraft((current) => ({ ...current, [fieldKey]: value }))}
                  />
                  {hoursTogether ? (
                    <Stack gap={2}>
                      <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                        Horário
                      </Text>
                      <Input
                        value={storeDraft.hours_seg ?? ''}
                        placeholder="Ex.: 8h às 18h"
                        onChange={(event) => {
                          const value = event.target.value
                          setStoreDraft((current) => {
                            const next = { ...current }
                            for (const hourKey of HOUR_KEYS) next[hourKey] = value
                            return next
                          })
                        }}
                      />
                      <Button variant="ghost" alignSelf="flex-start" onClick={() => setHoursTogether(false)}>
                        Informar cada dia
                      </Button>
                    </Stack>
                  ) : (
                    <StoreGroup
                      title="Horário"
                      keys={HOUR_KEYS}
                      labels={labelFor}
                      draft={storeDraft}
                      editing={storeEditing}
                      onChange={(fieldKey, value) => setStoreDraft((current) => ({ ...current, [fieldKey]: value }))}
                    />
                  )}
                  {!storeEditing && storeComplete && (
                    <Button variant="ghost" alignSelf="flex-start" onClick={() => setStoreEditing(true)}>
                      Corrigir
                    </Button>
                  )}
                </Stack>
              ) : (
                <Stack gap={2}>
                  {choice?.options.map((option) => {
                    const active = selected === option && !otherOpen
                    return (
                      <Button
                        key={option}
                        variant={active ? 'solid' : 'outline'}
                        justifyContent="flex-start"
                        h="auto"
                        py={3}
                        px={4}
                        borderRadius="xl"
                        whiteSpace="normal"
                        textAlign="left"
                        onClick={() => {
                          setSelected(option)
                          setOtherOpen(false)
                        }}
                      >
                        {option}
                      </Button>
                    )
                  })}
                  {choice && !choice.textOnly && key !== LAUNDRY_TYPE_KEY && (
                    <Button
                      variant={otherOpen ? 'solid' : 'outline'}
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      borderRadius="xl"
                      onClick={() => {
                        setOtherOpen(true)
                        setSelected(null)
                      }}
                    >
                      Outra resposta
                    </Button>
                  )}
                  {(otherOpen || choice?.textOnly) && (
                    <Input
                      value={otherText}
                      placeholder="Escreva sua resposta"
                      onChange={(event) => setOtherText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void save()
                      }}
                    />
                  )}
                </Stack>
              )}
            </Stack>
            <Flex justify="space-between" px={6} py={4} borderTopWidth="1px" borderColor="border.muted">
              <Button variant="ghost" disabled={index === 0 || busy} onClick={() => setIndex((value) => value - 1)}>
                Voltar
              </Button>
              <Button disabled={busy || !answerValue()} onClick={() => void save()}>
                {continueLabel}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function StoreGroup({
  title,
  keys,
  labels,
  draft,
  editing,
  onChange,
}: {
  title: string
  keys: readonly string[]
  labels: (key: string) => string
  draft: Record<string, string>
  editing: boolean
  onChange: (key: string, value: string) => void
}) {
  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium" color="fg.muted">
        {title}
      </Text>
      <Stack gap={2} borderWidth="1px" borderColor="border.muted" borderRadius="xl" p={3}>
        {keys.map((fieldKey) => {
          const value = draft[fieldKey] ?? ''
          const showInput = editing || value.trim() === ''
          return (
            <Flex key={fieldKey} align="center" justify="space-between" gap={3}>
              <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                {labels(fieldKey).replace(/^Horário de /, '').replace(/^./, (letter) => letter.toUpperCase())}
              </Text>
              {showInput ? (
                <Input
                  size="sm"
                  value={value}
                  maxW="16rem"
                  onChange={(event) => onChange(fieldKey, event.target.value)}
                />
              ) : (
                <Text fontSize="sm" textAlign="right">
                  {value}
                </Text>
              )}
            </Flex>
          )
        })}
      </Stack>
    </Stack>
  )
}

const AIAgentWizardModal = memo(AIAgentWizardModalBase)

export { AIAgentWizardModal }
