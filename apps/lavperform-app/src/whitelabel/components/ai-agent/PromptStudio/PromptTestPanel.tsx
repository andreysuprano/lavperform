import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
  Textarea,
  Wrap,
} from '@chakra-ui/react'
import { memo, useState } from 'react'

import type { PromptDocument, PromptProposal } from '@/whitelabel/types'

interface PromptTestPanelProps {
  document: PromptDocument | null
  suggestedQuestions: string[]
  proposal: PromptProposal | null
  onTest: (question: string) => Promise<string>
  onPropose: (payload: {
    question: string
    answer: string
    whatWasWrong: string
  }) => Promise<void>
  onAcceptProposal: () => void
  onDiscardProposal: () => void
  isTesting?: boolean
  isProposing?: boolean
}

function PromptTestPanelBase({
  document,
  suggestedQuestions,
  proposal,
  onTest,
  onPropose,
  onAcceptProposal,
  onDiscardProposal,
  isTesting = false,
  isProposing = false,
}: PromptTestPanelProps) {
  const [freeQuestion, setFreeQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [whatWasWrong, setWhatWasWrong] = useState('')
  const [showWrongForm, setShowWrongForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canTest = Boolean(document)

  const runTest = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || !document) return

    setError(null)
    setShowWrongForm(false)
    setWhatWasWrong('')
    setLastQuestion(trimmed)
    setAnswer('')

    try {
      const result = await onTest(trimmed)
      setAnswer(result)
    } catch {
      setError('Não foi possível testar a pergunta. Tente de novo.')
    }
  }

  const handlePropose = async () => {
    const wrong = whatWasWrong.trim()
    if (!wrong || !lastQuestion || !answer) return

    setError(null)
    try {
      await onPropose({
        question: lastQuestion,
        answer,
        whatWasWrong: wrong,
      })
      setShowWrongForm(false)
      setWhatWasWrong('')
    } catch {
      setError('Não foi possível propor a correção. Tente de novo.')
    }
  }

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Text fontWeight="semibold" fontSize="sm">
          Testar o prompt
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Escolha uma pergunta sugerida ou digite a sua. O teste usa o documento
          da tela e não grava conversa.
        </Text>
      </Stack>

      {suggestedQuestions.length > 0 ? (
        <Wrap gap={2}>
          {suggestedQuestions.map((question) => (
            <Button
              key={question}
              size="sm"
              variant="outline"
              disabled={!canTest || isTesting}
              onClick={() => void runTest(question)}
            >
              {question}
            </Button>
          ))}
        </Wrap>
      ) : (
        <Text fontSize="sm" color="fg.muted">
          Gere o prompt para ver perguntas sugeridas.
        </Text>
      )}

      <Stack gap={2}>
        <Textarea
          value={freeQuestion}
          onChange={(e) => setFreeQuestion(e.target.value)}
          placeholder="Pergunta livre..."
          rows={2}
          disabled={!canTest}
        />
        <Button
          size="sm"
          alignSelf="flex-start"
          loading={isTesting}
          disabled={!canTest || !freeQuestion.trim()}
          onClick={() => void runTest(freeQuestion)}
        >
          Testar pergunta
        </Button>
      </Stack>

      {error ? (
        <Text fontSize="sm" color="fg.error">
          {error}
        </Text>
      ) : null}

      {answer ? (
        <Box
          borderWidth="1px"
          borderRadius="md"
          p={4}
          bg="bg.subtle"
        >
          <Stack gap={3}>
            <Text fontSize="xs" color="fg.muted">
              Pergunta: {lastQuestion}
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {answer}
            </Text>
            {!showWrongForm ? (
              <Button
                size="sm"
                variant="outline"
                alignSelf="flex-start"
                onClick={() => setShowWrongForm(true)}
              >
                Não ficou boa
              </Button>
            ) : (
              <Stack gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  O que estava errado?
                </Text>
                <Textarea
                  value={whatWasWrong}
                  onChange={(e) => setWhatWasWrong(e.target.value)}
                  placeholder="Descreva o problema na resposta..."
                  rows={3}
                />
                <HStack>
                  <Button
                    size="sm"
                    loading={isProposing}
                    disabled={!whatWasWrong.trim()}
                    onClick={() => void handlePropose()}
                  >
                    Pedir correção
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowWrongForm(false)
                      setWhatWasWrong('')
                    }}
                  >
                    Cancelar
                  </Button>
                </HStack>
              </Stack>
            )}
          </Stack>
        </Box>
      ) : null}

      {proposal ? (
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Stack gap={3}>
            <Text fontWeight="semibold" fontSize="sm">
              Proposta de correção
            </Text>
            <Text fontSize="sm">{proposal.summary}</Text>
            {Object.entries(proposal.changes).map(([key, value]) =>
              value ? (
                <Stack key={key} gap={1}>
                  <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                    {key}
                  </Text>
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {value}
                  </Text>
                </Stack>
              ) : null
            )}
            <HStack>
              <Button size="sm" onClick={onAcceptProposal}>
                Aceitar
              </Button>
              <Button size="sm" variant="outline" onClick={onDiscardProposal}>
                Descartar
              </Button>
            </HStack>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  )
}

const PromptTestPanel = memo(PromptTestPanelBase) as typeof PromptTestPanelBase

export { PromptTestPanel, type PromptTestPanelProps }
