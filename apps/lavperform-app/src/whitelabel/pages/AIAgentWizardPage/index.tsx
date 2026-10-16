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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { CADASTRO_KEYS, scriptFor } from '@/whitelabel/components/ai-agent/PromptStudio/sheet-script'
import { snapshotShownValue } from '@/whitelabel/components/ai-agent/PromptStudio/snapshot-shown-value'
import {
  LAUNDRY_TYPE_KEY,
  laundryModelFromLabel,
  nextWizardKey,
  objectiveFor,
  STORE_KEY,
  wizardChoice,
  wizardKeys,
  wizardProgress,
  wizardQuestion,
  wizardShownAnswer,
  wizardStepFilled,
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

type StepDraft = {
  selected: string | null
  otherOpen: boolean
  otherText: string
  storeDraft: Record<string, string>
  storeEditing: boolean
  hoursTogether: boolean
}

const EMPTY_DRAFT: StepDraft = {
  selected: null,
  otherOpen: false,
  otherText: '',
  storeDraft: {},
  storeEditing: false,
  hoursTogether: false,
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

function progressOf(sheet: PromptSheetResponse) {
  return {
    agentName: sheet.agentName ?? '',
    agentObjective: sheet.agentObjective ?? '',
    answers: sheet.answers,
  }
}

function savedValue(stepKey: string, sheet: PromptSheetResponse): string {
  if (stepKey === 'agentName') return sheet.agentName ?? ''
  if (stepKey === LAUNDRY_TYPE_KEY) {
    return sheet.serviceModel === 'SELF_SERVICE' ? 'Auto serviço' : 'Convencional'
  }
  return sheet.answers[stepKey] ?? ''
}

function initialDraft(stepKey: string, sheet: PromptSheetResponse): StepDraft {
  const storeDraft = Object.fromEntries(CADASTRO_KEYS.map((cadastroKey) => [cadastroKey, storeValue(cadastroKey, sheet)]))
  const identityMissing = CADASTRO_KEYS.some(
    (cadastroKey) => !cadastroKey.startsWith('hours_') && (storeDraft[cadastroKey] ?? '').trim() === ''
  )
  const hoursTogether = HOUR_KEYS.every((hourKey) => (storeDraft[hourKey] ?? '').trim() === '')
  const choice = wizardChoice(stepKey, sheet.serviceModel, presetFor(stepKey, sheet))
  const value = savedValue(stepKey, sheet)
  let selected: string | null = null
  let otherOpen = false
  let otherText = ''
  if (stepKey !== STORE_KEY) {
    if (choice.options.includes(value)) {
      selected = value
    } else if (value.trim() !== '') {
      otherOpen = true
      otherText = value
    } else {
      otherOpen = choice.textOnly
    }
  }
  return { selected, otherOpen, otherText, storeDraft, storeEditing: identityMissing, hoursTogether }
}

function draftValue(stepKey: string, draft: StepDraft, sheet: PromptSheetResponse): string {
  if (stepKey === STORE_KEY) {
    const complete = CADASTRO_KEYS.every((cadastroKey) => (draft.storeDraft[cadastroKey] ?? '').trim() !== '')
    return complete ? 'ok' : ''
  }
  const choice = wizardChoice(stepKey, sheet.serviceModel, presetFor(stepKey, sheet))
  if (draft.otherOpen || choice.textOnly) return draft.otherText.trim()
  return draft.selected?.trim() ?? ''
}

function AIAgentWizardModalBase({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { selectedCompany, updateCompanyFlags } = useAuth()
  const companyId = selectedCompany?.id
  const [sheet, setSheet] = useState<PromptSheetResponse | null>(null)
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<StepDraft>(EMPTY_DRAFT)
  const [revisingKey, setRevisingKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const currentStepRef = useRef<HTMLDivElement>(null)
  const [seenKey, setSeenKey] = useState<string | null>(null)

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
    const next = nextWizardKey(sheet.serviceModel, progressOf(sheet))
    setIndex(next ? Math.max(keys.indexOf(next), 0) : Math.max(keys.length - 1, 0))
    setReady(true)
  }, [open, sheet, ready, keys])

  useEffect(() => {
    if (!ready) return
    const node = currentStepRef.current
    if (!node || typeof node.scrollIntoView !== 'function') return
    node.scrollIntoView({ block: 'nearest' })
  }, [index, ready])

  if (sheet && key && draftKey !== key) {
    setDraftKey(key)
    setDraft(initialDraft(key, sheet))
  }

  if (seenKey !== key) {
    setSeenKey(key)
    if (revisingKey !== null) setRevisingKey(null)
  }

  const progress = sheet ? wizardProgress(sheet.serviceModel, progressOf(sheet)) : { answered: 0, total: 1 }
  const visibleKeys = sheet
    ? keys.filter((stepKey) => stepKey === key || wizardStepFilled(stepKey, progressOf(sheet)))
    : []

  const alignToCurrent = (fresh: PromptSheetResponse) => {
    const freshKeys = wizardKeys(fresh.serviceModel)
    const kept = key ? freshKeys.indexOf(key) : -1
    if (kept >= 0) {
      setIndex(kept)
      return
    }
    const next = nextWizardKey(fresh.serviceModel, progressOf(fresh))
    setIndex(next ? freshKeys.indexOf(next) : Math.max(freshKeys.length - 1, 0))
  }

  const fail = async (error: unknown) => {
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
  }

  const writeStep = async (stepKey: string, input: StepDraft, base: PromptSheetResponse) => {
    if (!companyId) return false
    const value = draftValue(stepKey, input, base)
    if (stepKey === LAUNDRY_TYPE_KEY) {
      const model = laundryModelFromLabel(input.selected ?? '')
      if (!model) return false
      await aiAgentService.putPromptSheetIntro(companyId, {
        agentObjective: objectiveFor(model),
        serviceModel: model,
        sheetUpdatedAt: base.updatedAt ?? undefined,
      })
      updateCompanyFlags(companyId, { serviceModel: model })
      return true
    }
    if (stepKey === STORE_KEY) {
      let updatedAt = base.updatedAt ?? undefined
      for (const cadastroKey of CADASTRO_KEYS) {
        const response = await aiAgentService.putPromptSheetAnswer(companyId, {
          key: cadastroKey,
          value: input.storeDraft[cadastroKey].trim(),
          sheetUpdatedAt: updatedAt,
        })
        updatedAt = response.data.updatedAt
      }
      return true
    }
    if (stepKey === 'agentName') {
      await aiAgentService.putPromptSheetIntro(companyId, {
        agentName: value,
        sheetUpdatedAt: base.updatedAt ?? undefined,
      })
      return true
    }
    await aiAgentService.putPromptSheetAnswer(companyId, {
      key: stepKey,
      value,
      sheetUpdatedAt: base.updatedAt ?? undefined,
    })
    return true
  }

  const commit = async (
    stepKey: string,
    input: StepDraft,
    after?: (fresh: PromptSheetResponse) => Promise<void> | void
  ) => {
    if (!companyId || !sheet) return false
    if (!draftValue(stepKey, input, sheet)) return false
    setBusy(true)
    setNotice(null)
    try {
      const wrote = await writeStep(stepKey, input, sheet)
      if (!wrote) return false
      const fresh = await load()
      if (!fresh) return false
      if (after) await after(fresh)
      return true
    } catch (error) {
      await fail(error)
      scrollerRef.current?.scrollTo?.({ top: 0 })
      return false
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!key) return
    await commit(key, draft, async (fresh) => {
      const next = nextWizardKey(fresh.serviceModel, progressOf(fresh))
      if (!next) {
        if (!companyId) return
        const created = await aiAgentService.finishWizard(companyId)
        onClose()
        navigate(`/whitelabel/ai-agent/${created.data.id}/conversa`)
        return
      }
      setIndex(wizardKeys(fresh.serviceModel).indexOf(next))
    })
  }

  const savePast = (stepKey: string, input: StepDraft) =>
    commit(stepKey, input, async (fresh) => {
      if (stepKey === LAUNDRY_TYPE_KEY) alignToCurrent(fresh)
    })

  const continueLabel = key === STORE_KEY ? 'Confirmar' : index === keys.length - 1 ? 'Criar agente' : 'Continuar'
  const canContinue = Boolean(sheet && key && draftValue(key, draft, sheet))

  return (
    <Dialog.Root
      closeOnInteractOutside={!busy}
      onOpenChange={(details) => {
        if (!details.open && !busy) onClose()
      }}
      open={open}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="2xl" maxW="34rem" overflow="hidden" p={0} w="full">
            <Flex align="center" justify="space-between" pb={4} pt={5} px={6}>
              <Stack gap={1}>
                <Text color="fg.muted" fontSize="sm">
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
            <Box bg="bg.muted" h="3px">
              <Box bg="primary.500" h="full" width={`${Math.round((progress.answered / progress.total) * 100)}%`} />
            </Box>
            <Stack gap={4} maxH="62vh" overflowY="auto" px={6} py={6} ref={scrollerRef}>
              {notice && <Text color="fg.muted">{notice}</Text>}
              {ready &&
                sheet &&
                visibleKeys.map((stepKey) =>
                  stepKey === key ? (
                    <Stack gap={5} key={stepKey} ref={currentStepRef}>
                      <Text fontSize="xl" fontWeight="semibold" lineHeight="short">
                        {wizardQuestion(stepKey, sheet.serviceModel)}
                      </Text>
                      <StepEditor
                        draft={draft}
                        onChange={setDraft}
                        onEnter={() => void save()}
                        sheet={sheet}
                        stepKey={stepKey}
                      />
                    </Stack>
                  ) : (
                    <AnsweredStep
                      busy={busy}
                      expanded={revisingKey === stepKey}
                      key={stepKey}
                      onCollapse={() => setRevisingKey((current) => (current === stepKey ? null : current))}
                      onExpand={() => setRevisingKey(stepKey)}
                      onSave={(input) => savePast(stepKey, input)}
                      sheet={sheet}
                      stepKey={stepKey}
                    />
                  )
                )}
            </Stack>
            <Flex borderColor="border.muted" borderTopWidth="1px" justify="space-between" px={6} py={4}>
              <Button disabled={index === 0 || busy} onClick={() => setIndex((value) => value - 1)} variant="ghost">
                Voltar
              </Button>
              <Button disabled={busy || !canContinue} onClick={() => void save()}>
                {continueLabel}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function StepEditor({
  stepKey,
  sheet,
  draft,
  onChange,
  onEnter,
}: {
  stepKey: string
  sheet: PromptSheetResponse
  draft: StepDraft
  onChange: (draft: StepDraft) => void
  onEnter: () => void
}) {
  const choice = wizardChoice(stepKey, sheet.serviceModel, presetFor(stepKey, sheet))
  const fields = scriptFor(sheet.serviceModel)
  const labelFor = (fieldKey: string) => fields.find((field) => field.key === fieldKey)?.label ?? fieldKey
  const identityKeys = CADASTRO_KEYS.filter((cadastroKey) => !cadastroKey.startsWith('hours_'))
  const storeComplete = CADASTRO_KEYS.every((cadastroKey) => (draft.storeDraft[cadastroKey] ?? '').trim() !== '')

  if (stepKey === STORE_KEY) {
    return (
      <Stack gap={5}>
        <Text color="fg.muted" fontSize="sm">
          Estes dados vêm do cadastro da loja. Confirme se estão certos.
        </Text>
        <StoreGroup
          draft={draft.storeDraft}
          editing={draft.storeEditing}
          keys={identityKeys}
          labels={labelFor}
          onChange={(fieldKey, value) =>
            onChange({ ...draft, storeDraft: { ...draft.storeDraft, [fieldKey]: value } })
          }
          title="Loja"
        />
        {draft.hoursTogether ? (
          <Stack gap={2}>
            <Text color="fg.muted" fontSize="sm" fontWeight="medium">
              Horário
            </Text>
            <Input
              onChange={(event) => {
                const value = event.target.value
                const storeDraft = { ...draft.storeDraft }
                for (const hourKey of HOUR_KEYS) storeDraft[hourKey] = value
                onChange({ ...draft, storeDraft })
              }}
              placeholder="Ex.: 8h às 18h"
              value={draft.storeDraft.hours_seg ?? ''}
            />
            <Button alignSelf="flex-start" onClick={() => onChange({ ...draft, hoursTogether: false })} variant="ghost">
              Informar cada dia
            </Button>
          </Stack>
        ) : (
          <StoreGroup
            draft={draft.storeDraft}
            editing={draft.storeEditing}
            keys={HOUR_KEYS}
            labels={labelFor}
            onChange={(fieldKey, value) =>
              onChange({ ...draft, storeDraft: { ...draft.storeDraft, [fieldKey]: value } })
            }
            title="Horário"
          />
        )}
        {!draft.storeEditing && storeComplete && (
          <Button alignSelf="flex-start" onClick={() => onChange({ ...draft, storeEditing: true })} variant="ghost">
            Corrigir
          </Button>
        )}
      </Stack>
    )
  }

  return (
    <Stack gap={2}>
      {choice.options.map((option) => {
        const active = draft.selected === option && !draft.otherOpen
        return (
          <Button
            borderRadius="xl"
            h="auto"
            justifyContent="flex-start"
            key={option}
            onClick={() => onChange({ ...draft, selected: option, otherOpen: false })}
            px={4}
            py={3}
            textAlign="left"
            variant={active ? 'solid' : 'outline'}
            whiteSpace="normal"
          >
            {option}
          </Button>
        )
      })}
      {choice && !choice.textOnly && stepKey !== LAUNDRY_TYPE_KEY && (
        <Button
          borderRadius="xl"
          h="auto"
          justifyContent="flex-start"
          onClick={() => onChange({ ...draft, otherOpen: true, selected: null })}
          py={3}
          variant={draft.otherOpen ? 'solid' : 'outline'}
        >
          Outra resposta
        </Button>
      )}
      {(draft.otherOpen || choice.textOnly) && (
        <Input
          onChange={(event) => onChange({ ...draft, otherText: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onEnter()
          }}
          placeholder="Escreva sua resposta"
          value={draft.otherText}
        />
      )}
    </Stack>
  )
}

function AnsweredStep({
  stepKey,
  sheet,
  busy,
  expanded,
  onExpand,
  onCollapse,
  onSave,
}: {
  stepKey: string
  sheet: PromptSheetResponse
  busy: boolean
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onSave: (draft: StepDraft) => Promise<boolean>
}) {
  const [draftStep, setDraftStep] = useState<string | null>(null)
  const [draft, setDraft] = useState<StepDraft>(EMPTY_DRAFT)
  const cardRef = useRef<HTMLDivElement>(null)
  const question = wizardQuestion(stepKey, sheet.serviceModel)

  useEffect(() => {
    if (!expanded) return
    const node = cardRef.current
    if (!node || typeof node.scrollIntoView !== 'function') return
    node.scrollIntoView({ block: 'nearest' })
  }, [expanded])
  const answer = wizardShownAnswer(stepKey, sheet.serviceModel, progressOf(sheet))

  if (expanded && draftStep !== stepKey) {
    setDraftStep(stepKey)
    setDraft(initialDraft(stepKey, sheet))
  } else if (!expanded && draftStep !== null) {
    setDraftStep(null)
  }

  const save = async () => {
    if (!draftValue(stepKey, draft, sheet)) return
    const ok = await onSave(draft)
    if (ok) onCollapse()
  }

  if (!expanded) {
    return (
      <Flex
        align="flex-start"
        borderColor="border.muted"
        borderRadius="xl"
        borderWidth="1px"
        gap={3}
        px={4}
        py={3}
        ref={cardRef}
      >
        <Stack flex="1" gap={1} minW={0}>
          <Text color="fg.muted" fontSize="sm">
            {question}
          </Text>
          <Text fontSize="sm" fontWeight="medium" whiteSpace="pre-line" wordBreak="break-word">
            {answer}
          </Text>
        </Stack>
        <Button
          aria-label={`Alterar: ${question}`}
          disabled={busy}
          flexShrink={0}
          onClick={onExpand}
          size="sm"
          variant="ghost"
        >
          Alterar
        </Button>
      </Flex>
    )
  }

  return (
    <Stack borderColor="border.muted" borderRadius="xl" borderWidth="1px" gap={3} px={4} py={3} ref={cardRef}>
      <Text color="fg.muted" fontSize="sm">
        {question}
      </Text>
      <StepEditor draft={draft} onChange={setDraft} onEnter={() => void save()} sheet={sheet} stepKey={stepKey} />
      <Flex gap={2} justify="flex-end">
        <Button disabled={busy} onClick={onCollapse} variant="ghost">
          Cancelar
        </Button>
        <Button disabled={busy || !draftValue(stepKey, draft, sheet)} onClick={() => void save()}>
          Salvar
        </Button>
      </Flex>
    </Stack>
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
      <Text color="fg.muted" fontSize="sm" fontWeight="medium">
        {title}
      </Text>
      <Stack borderColor="border.muted" borderRadius="xl" borderWidth="1px" gap={2} p={3}>
        {keys.map((fieldKey) => {
          const value = draft[fieldKey] ?? ''
          const showInput = editing || value.trim() === ''
          return (
            <Flex align="center" gap={3} justify="space-between" key={fieldKey}>
              <Text color="fg.muted" flexShrink={0} fontSize="sm">
                {labels(fieldKey).replace(/^Horário de /, '').replace(/^./, (letter) => letter.toUpperCase())}
              </Text>
              {showInput ? (
                <Input
                  maxW="16rem"
                  onChange={(event) => onChange(fieldKey, event.target.value)}
                  size="sm"
                  value={value}
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
