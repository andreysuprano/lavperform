import { Box, Button, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { LuBot } from 'react-icons/lu'
import { RiArrowLeftLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

import { AppContentLayout } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  nextWizardKey,
  wizardChoice,
  wizardKeys,
  wizardProgress,
  wizardQuestion,
} from '@/whitelabel/components/ai-agent/PromptStudio/wizard-steps'
import { snapshotShownValue } from '@/whitelabel/components/ai-agent/PromptStudio/snapshot-shown-value'
import { aiAgentService } from '@/whitelabel/services'
import type { PromptSheetResponse } from '@/whitelabel/types'

const STALE = 'O texto mudou. Peça a alteração de novo.'

function presetFor(key: string, sheet: PromptSheetResponse): string | null {
  if (key === 'agentName') return sheet.snapshot.name
  return snapshotShownValue(key, sheet.snapshot)
}

function AIAgentWizardPageBase() {
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const [sheet, setSheet] = useState<PromptSheetResponse | null>(null)
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!companyId) return null
    const response = await aiAgentService.getPromptSheet(companyId)
    setSheet(response.data)
    return response.data
  }, [companyId])

  useEffect(() => {
    void load().catch(() => setNotice('Não foi possível carregar a ficha.'))
  }, [load])

  const keys = useMemo(
    () => (sheet ? wizardKeys(sheet.serviceModel) : []),
    [sheet]
  )
  const key = keys[index] ?? null

  useEffect(() => {
    if (!sheet || ready || keys.length === 0) return
    const next = nextWizardKey(sheet.serviceModel, {
      agentName: sheet.agentName ?? '',
      agentObjective: sheet.agentObjective ?? '',
      answers: sheet.answers,
    })
    setIndex(next ? Math.max(keys.indexOf(next), 0) : Math.max(keys.length - 1, 0))
    setReady(true)
  }, [sheet, ready, keys])

  const choice = sheet && key ? wizardChoice(key, sheet.serviceModel, presetFor(key, sheet)) : null
  const progress = sheet
    ? wizardProgress(sheet.serviceModel, {
        agentName: sheet.agentName ?? '',
        agentObjective: sheet.agentObjective ?? '',
        answers: sheet.answers,
      })
    : { answered: 0, total: 1 }

  const currentValue = () => {
    if (!sheet || !key) return ''
    if (key === 'agentName') return sheet.agentName ?? ''
    if (key === 'agentObjective') return sheet.agentObjective ?? ''
    return sheet.answers[key] ?? ''
  }

  useEffect(() => {
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

  const answerValue = () => {
    if (otherOpen || choice?.textOnly) return otherText.trim()
    return selected?.trim() ?? ''
  }

  const save = async () => {
    if (!companyId || !sheet || !key) return
    const value = answerValue()
    if (!value) return
    setBusy(true)
    setNotice(null)
    try {
      if (key === 'agentName' || key === 'agentObjective') {
        await aiAgentService.putPromptSheetIntro(companyId, {
          [key]: value,
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
      const next = nextWizardKey(fresh.serviceModel, {
        agentName: fresh.agentName ?? '',
        agentObjective: fresh.agentObjective ?? '',
        answers: fresh.answers,
      })
      if (!next) {
        const created = await aiAgentService.finishWizard(companyId)
        navigate(`/whitelabel/ai-agent/${created.data.id}`)
        return
      }
      setIndex(wizardKeys(fresh.serviceModel).indexOf(next))
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
        const target = wizardKeys(sheet.serviceModel).indexOf(missing[0])
        if (target >= 0) setIndex(target)
        setNotice('Falta responder uma pergunta.')
        return
      }
      setNotice('Não foi possível guardar a resposta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppContentLayout icon={<LuBot />} title="Novo agente">
      <Button size="xs" variant="ghost" alignSelf="flex-start" onClick={() => navigate('/whitelabel/ai-agent')}>
        <RiArrowLeftLine />
        Agentes de IA
      </Button>
      <Flex flex="1" align="center" justify="center" py={8}>
        <Stack gap={6} w="full" maxW="32rem">
          <Box h="2" bg="bg.muted" borderRadius="full" overflow="hidden">
            <Box
              h="full"
              bg="primary.500"
              width={`${Math.round((progress.answered / progress.total) * 100)}%`}
            />
          </Box>
          <Text fontSize="sm" color="fg.muted">
            {progress.answered} de {progress.total}
          </Text>
          {key && sheet && (
            <Text fontSize="2xl" fontWeight="semibold">
              {wizardQuestion(key, sheet.serviceModel)}
            </Text>
          )}
          {notice && <Text color="fg.muted">{notice}</Text>}
          <Stack gap={3}>
            {choice?.options.map((option) => (
              <Button
                key={option}
                variant={selected === option && !otherOpen ? 'solid' : 'outline'}
                justifyContent="flex-start"
                onClick={() => {
                  setSelected(option)
                  setOtherOpen(false)
                }}
              >
                {option}
              </Button>
            ))}
            {choice && !choice.textOnly && (
              <Button
                variant={otherOpen ? 'solid' : 'outline'}
                justifyContent="flex-start"
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
          <Flex justify="space-between">
            <Button variant="ghost" disabled={index === 0 || busy} onClick={() => setIndex((value) => value - 1)}>
              Voltar
            </Button>
            <Button
              disabled={busy || !answerValue()}
              onClick={() => void save()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void save()
              }}
            >
              Continuar
            </Button>
          </Flex>
        </Stack>
      </Flex>
    </AppContentLayout>
  )
}

const AIAgentWizardPage = memo(AIAgentWizardPageBase)

export { AIAgentWizardPage }
