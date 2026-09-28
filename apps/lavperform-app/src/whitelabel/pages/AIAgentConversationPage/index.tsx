import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuBot } from 'react-icons/lu'
import { RiArrowLeftLine } from 'react-icons/ri'
import { useNavigate, useParams } from 'react-router-dom'

import { AppContentLayout } from '@/components'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import { toBase64, uploadFileWithBase64 } from '@/firebase/storage'
import { useAIAgent, useUpdateAIAgentPersona } from '@/whitelabel/hooks'
import { aiAgentService } from '@/whitelabel/services'
import type { PromptDocument, PromptSheetResponse } from '@/whitelabel/types'
import { MAX_FILE_SIZE, MAX_FILE_SIZE_IN_BYTES } from '@/utils/constants/upload'

import {
  INTRO_FIELDS,
  MEDIA_FIELD,
  nextConversationStep,
  type ConversationStep,
} from '@/whitelabel/components/ai-agent/PromptStudio/conversation-steps'
import {
  nextQuestion,
  scriptFor,
} from '@/whitelabel/components/ai-agent/PromptStudio/sheet-script'
import { snapshotShownValue } from '@/whitelabel/components/ai-agent/PromptStudio/snapshot-shown-value'

const NAO_TEM = 'Não tem'

type ChatLine = { role: 'bot' | 'user'; text: string }

type Draft = {
  agentName: string
  agentDescription: string
  media: string
}

const emptyDraft = (): Draft => ({
  agentName: '',
  agentDescription: '',
  media: '',
})

function storageKey(companyId: string, agentId?: string) {
  return `agent-chat-draft:${companyId}:${agentId ?? 'new'}`
}

function readDraft(companyId: string, agentId?: string): Draft {
  try {
    const raw = localStorage.getItem(storageKey(companyId, agentId))
    if (!raw) return emptyDraft()
    const parsed = JSON.parse(raw) as Partial<Draft>
    return {
      agentName: parsed.agentName ?? '',
      agentDescription: parsed.agentDescription ?? '',
      media: parsed.media ?? '',
    }
  } catch {
    return emptyDraft()
  }
}

function Bubble({ role, text }: ChatLine) {
  const mine = role === 'user'
  return (
    <Box
      alignSelf={mine ? 'flex-end' : 'flex-start'}
      maxW="80%"
      bg={mine ? 'bg.muted' : 'bg.subtle'}
      borderWidth="1px"
      borderRadius="xl"
      px={4}
      py={3}
    >
      <Text fontSize="sm" whiteSpace="pre-wrap">
        {text}
      </Text>
    </Box>
  )
}

function buildHistory(draft: Draft, sheet: PromptSheetResponse | null): ChatLine[] {
  const history: ChatLine[] = []
  for (const field of INTRO_FIELDS) {
    const value = draft[field.key].trim()
    if (!value) break
    history.push({ role: 'bot', text: field.question })
    history.push({ role: 'user', text: value })
  }
  if (sheet) {
    for (const field of scriptFor(sheet.serviceModel)) {
      const value = (sheet.answers[field.key] ?? '').trim()
      if (!value) break
      history.push({ role: 'bot', text: field.question })
      history.push({ role: 'user', text: value })
    }
  }
  if (draft.media.trim()) {
    history.push({ role: 'bot', text: MEDIA_FIELD.question })
    history.push({ role: 'user', text: draft.media })
  }
  return history
}

function AIAgentConversationPageBase() {
  const { agentId } = useParams()
  const isEdit = Boolean(agentId)
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const existing = useAIAgent(companyId, agentId)
  const updatePersona = useUpdateAIAgentPersona()

  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [draftReady, setDraftReady] = useState(false)
  const [sheet, setSheet] = useState<PromptSheetResponse | null>(null)
  const [document, setDocument] = useState<PromptDocument | null>(null)
  const [text, setText] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [testLines, setTestLines] = useState<ChatLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const generateStarted = useRef(false)
  const hydratedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!companyId) return
    const key = `${companyId}:${agentId ?? 'new'}`
    if (hydratedKey.current !== key) {
      hydratedKey.current = key
      const stored = readDraft(companyId, agentId)
      if (stored.media.trim() !== '' && stored.media.trim() !== NAO_TEM) {
        stored.media = ''
      }
      setDraft(stored)
      setDraftReady(true)
      return
    }
    const agent = existing.data
    if (!agent) return
    setDraft((current) => {
      if (current.agentName.trim() !== '') return current
      return {
        ...current,
        agentName: agent.name ?? '',
        agentDescription: agent.description ?? '',
      }
    })
  }, [companyId, agentId, existing.data])

  useEffect(() => {
    if (!companyId || !draftReady) return
    localStorage.setItem(storageKey(companyId, agentId), JSON.stringify(draft))
  }, [companyId, agentId, draft, draftReady])

  const loadSheet = useCallback(async () => {
    if (!companyId) return
    const response = await aiAgentService.getPromptSheet(companyId, agentId)
    setSheet(response.data)
  }, [companyId, agentId])

  useEffect(() => {
    if (!companyId) return
    void loadSheet().catch(() => {
      setError('Não foi possível carregar a ficha.')
    })
  }, [companyId, loadSheet])

  const step = useMemo(
    () =>
      nextConversationStep({
        intro: {
          agentName: draft.agentName,
          agentDescription: draft.agentDescription,
        },
        sheetModel: sheet?.serviceModel ?? null,
        sheetAnswers: sheet?.answers ?? {},
        media: draft.media,
        hasDocument: Boolean(document),
      }),
    [draft, sheet, document]
  )

  const sheetField =
    step.phase === 'ask-sheet' && sheet
      ? nextQuestion(sheet.serviceModel, sheet.answers)
      : null
  const shownValue =
    sheetField && sheet
      ? snapshotShownValue(sheetField.key, sheet.snapshot)
      : null
  const confirmMode = Boolean(shownValue) && !correcting

  const history = useMemo(() => buildHistory(draft, sheet), [draft, sheet])

  const currentQuestion =
    step.phase === 'ask-intro'
      ? step.question
      : step.phase === 'ask-sheet'
        ? sheetField?.question
        : step.phase === 'ask-media'
          ? MEDIA_FIELD.question
          : step.phase === 'generate'
            ? 'Estou montando o prompt com as respostas.'
            : step.phase === 'test'
              ? 'O prompt está pronto. Pergunte como um cliente antes de publicar.'
              : 'Carregando a ficha.'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [history, testLines, step.phase, error])

  const saveSheetAnswer = async (value: string) => {
    if (!companyId || !sheetField || !sheet) return
    setBusy(true)
    setError(null)
    try {
      await aiAgentService.putPromptSheetAnswer(
        companyId,
        {
          key: sheetField.key,
          value,
          sheetUpdatedAt: sheet.updatedAt ?? undefined,
        },
        agentId
      )
      setCorrecting(false)
      setText('')
      await loadSheet()
    } catch {
      setError('Não foi possível guardar a resposta.')
    } finally {
      setBusy(false)
    }
  }

  const generate = useCallback(async () => {
    if (!sheet) return
    setBusy(true)
    setError(null)
    try {
      const response = await aiAgentService.generatePromptStudio(
        { model: sheet.serviceModel, answers: sheet.answers },
        agentId
      )
      setDocument(response.data.document)
    } catch {
      generateStarted.current = false
      setError('Não foi possível montar o prompt. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }, [sheet, agentId])

  useEffect(() => {
    if (step.phase !== 'generate' || document || generateStarted.current) return
    generateStarted.current = true
    void generate()
  }, [step.phase, document, generate])

  const sendTest = async () => {
    const question = text.trim()
    if (!question || !document) return
    setBusy(true)
    setError(null)
    setTestLines((current) => [...current, { role: 'user', text: question }])
    setText('')
    try {
      const response = await aiAgentService.testPromptStudio(
        { document, question },
        agentId
      )
      setTestLines((current) => [
        ...current,
        { role: 'bot', text: response.data.answer },
      ])
    } catch {
      setError('Não foi possível testar a pergunta.')
    } finally {
      setBusy(false)
    }
  }

  const publish = async () => {
    if (!companyId || !document || publishing) return
    setPublishing(true)
    setError(null)
    try {
      const persona = {
        personaName: draft.agentName.trim(),
        voiceTone: 'FORMAL' as const,
        communicationStyle: 'BALANCED' as const,
        language: 'PT_BR' as const,
        contextPrompt: document.contextPrompt,
        systemPrompt: document.systemPrompt,
        behaviorGuidelines: document.behaviorGuidelines,
        guardrails: document.guardrails,
      }
      let id = agentId
      if (!id) {
        const created = await aiAgentService.createAgent(companyId, {
          name: draft.agentName.trim(),
          description: draft.agentDescription.trim(),
          persona,
          modelConfig: {
            modelName: 'openai/gpt-5',
            temperature: 0.7,
            maxTokens: 8048,
          },
          memoryConfig: { memoryType: 'BUFFER', windowSize: 10 },
        })
        id = created.data.id
        await aiAgentService.adoptPromptSheet(companyId, id)
        await updatePersona.mutateAsync({ agentId: id, data: persona })
      } else {
        await aiAgentService.updateAgent(companyId, id, {
          name: draft.agentName.trim(),
          description: draft.agentDescription.trim(),
        })
        await updatePersona.mutateAsync({ agentId: id, data: persona })
      }

      if (mediaFile && id) {
        if (mediaFile.size > MAX_FILE_SIZE_IN_BYTES) {
          throw new Error(`O arquivo deve ter no máximo ${MAX_FILE_SIZE}MB.`)
        }
        const list = new DataTransfer()
        list.items.add(mediaFile)
        const encoded = await toBase64(list.files)
        const url = await uploadFileWithBase64(
          encoded as string,
          'ai-agent-knowledge'
        )
        await aiAgentService.createKnowledgeFile(companyId, id, {
          fileName: mediaFile.name,
          fileUrl: url,
          active: true,
        })
      }

      toaster.create({
        title: isEdit ? 'Agente atualizado' : 'Agente publicado',
        type: 'success',
      })
      navigate(`/whitelabel/ai-agent/${id}`)
    } catch {
      setError('Não foi possível publicar. O teste continua disponível.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <AppContentLayout
      icon={<LuBot />}
      title={isEdit ? 'Editar agente' : 'Criar agente'}
      action={
        step.phase === 'test' ? (
          <Button onClick={() => void publish()} loading={publishing}>
            {isEdit ? 'Salvar' : 'Publicar'}
          </Button>
        ) : null
      }
    >
      <Button
        size="xs"
        variant="ghost"
        onClick={() => navigate('/whitelabel/ai-agent')}
        alignSelf="flex-start"
      >
        <RiArrowLeftLine />
        Agentes de IA
      </Button>

      <Flex
        direction="column"
        h="calc(100vh - 220px)"
        minH="420px"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        bg="bg"
      >
        <Stack flex="1" overflowY="auto" px={6} py={6} gap={3}>
          {history.map((line, index) => (
            <Bubble key={`${line.role}-${index}`} role={line.role} text={line.text} />
          ))}
          {currentQuestion ? <Bubble role="bot" text={currentQuestion} /> : null}
          {shownValue && step.phase === 'ask-sheet' ? (
            <Text fontSize="sm" color="fg.muted" alignSelf="flex-start">
              Valor no cadastro: {shownValue}
            </Text>
          ) : null}
          {testLines.map((line, index) => (
            <Bubble key={`test-${index}`} role={line.role} text={line.text} />
          ))}
          {step.phase === 'generate' && busy ? <Spinner size="sm" /> : null}
          {error ? (
            <Text fontSize="sm" color="fg.error">
              {error}
            </Text>
          ) : null}
          <div ref={bottomRef} />
        </Stack>

        <Box borderTopWidth="1px" px={4} py={4}>
          <Composer
            step={step}
            confirmMode={confirmMode}
            text={text}
            busy={busy}
            onText={setText}
            onSendIntro={() => {
              if (step.phase !== 'ask-intro') return
              const value = text.trim()
              if (!value) return
              setDraft((current) => ({ ...current, [step.key]: value }))
              setText('')
            }}
            onConfirm={() => {
              if (shownValue) void saveSheetAnswer(shownValue)
            }}
            onCorrect={() => setCorrecting(true)}
            onSendSheet={() => {
              const value = text.trim()
              if (!value) return
              void saveSheetAnswer(value)
            }}
            onSkipMedia={() => {
              setMediaFile(null)
              setDraft((current) => ({ ...current, media: NAO_TEM }))
            }}
            onFile={(file) => {
              setMediaFile(file)
              setDraft((current) => ({ ...current, media: file.name }))
            }}
            onSendTest={() => void sendTest()}
            onRetryGenerate={() => {
              generateStarted.current = false
              void generate()
            }}
          />
        </Box>
      </Flex>
    </AppContentLayout>
  )
}

function Composer({
  step,
  confirmMode,
  text,
  busy,
  onText,
  onSendIntro,
  onConfirm,
  onCorrect,
  onSendSheet,
  onSkipMedia,
  onFile,
  onSendTest,
  onRetryGenerate,
}: {
  step: ConversationStep
  confirmMode: boolean
  text: string
  busy: boolean
  onText: (value: string) => void
  onSendIntro: () => void
  onConfirm: () => void
  onCorrect: () => void
  onSendSheet: () => void
  onSkipMedia: () => void
  onFile: (file: File) => void
  onSendTest: () => void
  onRetryGenerate: () => void
}) {
  if (step.phase === 'wait-sheet' || step.phase === 'generate') {
    return (
      <HStack>
        <Text fontSize="sm" color="fg.muted">
          {step.phase === 'generate' ? 'Montando o prompt…' : 'Carregando a ficha…'}
        </Text>
        {step.phase === 'generate' ? (
          <Button size="sm" variant="ghost" onClick={onRetryGenerate}>
            Tentar de novo
          </Button>
        ) : null}
      </HStack>
    )
  }

  if (step.phase === 'ask-sheet' && confirmMode) {
    return (
      <HStack>
        <Button onClick={onConfirm} loading={busy}>
          Confirmar
        </Button>
        <Button variant="outline" onClick={onCorrect}>
          Corrigir
        </Button>
      </HStack>
    )
  }

  if (step.phase === 'ask-media') {
    return (
      <HStack>
        <Input
          type="file"
          accept="image/*,audio/*,video/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFile(file)
          }}
          disabled={busy}
        />
        <Button variant="outline" onClick={onSkipMedia}>
          Não tem
        </Button>
      </HStack>
    )
  }

  const send =
    step.phase === 'ask-intro'
      ? onSendIntro
      : step.phase === 'test'
        ? onSendTest
        : onSendSheet

  return (
    <HStack>
      <Input
        value={text}
        placeholder={
          step.phase === 'test' ? 'Pergunte como um cliente' : 'Escreva a resposta'
        }
        onChange={(event) => onText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') send()
        }}
      />
      <Button onClick={send} loading={busy}>
        Enviar
      </Button>
    </HStack>
  )
}

const AIAgentConversationPage = memo(AIAgentConversationPageBase)

export { AIAgentConversationPage }
