import { Card, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react'
import { memo } from 'react'

import { type PersonalityType, type ResponseStyleType } from '@/whitelabel/types'

import { SelectableCard } from './SelectableCard'
import type { Props } from './AIAgentPersonalityCard.types'

const personalityOptions: Array<{
  value: PersonalityType
  title: string
  description: string
  badge?: string
}> = [
  {
    value: 'professional',
    title: 'Profissional',
    description: 'Formal e objetivo',
    badge: 'Recomendado',
  },
  {
    value: 'friendly',
    title: 'Amigável',
    description: 'Próximo e humanizado',
  },
  {
    value: 'casual',
    title: 'Descontraído',
    description: 'Leve e jovem',
  },
]

const responseStyleOptions: Array<{
  value: ResponseStyleType
  title: string
  description: string
  badge?: string
}> = [
  {
    value: 'concise',
    title: 'Conciso',
    description: 'Respostas diretas e objetivas',
  },
  {
    value: 'detailed',
    title: 'Detalhado',
    description: 'Explicações completas e detalhadas',
  },
  {
    value: 'balanced',
    title: 'Equilibrado',
    description: 'Bom equilíbrio entre conciso e detalhado',
    badge: 'Padrão',
  },
]

const languageOptions: Array<{
  value: 'pt-BR' | 'en-US'
  title: string
  description: string
  badge?: string
}> = [
  {
    value: 'pt-BR',
    title: 'Português (Brasil)',
    description: 'Idioma padrão',
    badge: 'Padrão',
  },
]

function AIAgentPersonalityCardBase({
  personality = 'professional',
  responseStyle = 'balanced',
  language = 'pt-BR',
  prompt = '',
  onPersonalityChange,
  onResponseStyleChange,
  onLanguageChange,
  onPromptChange,
}: Props) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Personalidade e Estilo</Card.Title>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <Stack gap={1.5}>
            <Text fontSize="sm" fontWeight="semibold">
              Personalidade
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
              {personalityOptions.map((option) => (
                <SelectableCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={personality === option.value}
                  onClick={() => onPersonalityChange?.(option.value)}
                  badge={option.badge}
                />
              ))}
            </SimpleGrid>
          </Stack>

          <Stack gap={1.5}>
            <Text fontSize="sm" fontWeight="semibold">
              Estilo de Resposta
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
              {responseStyleOptions.map((option) => (
                <SelectableCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={responseStyle === option.value}
                  onClick={() => onResponseStyleChange?.(option.value)}
                  badge={option.badge}
                />
              ))}
            </SimpleGrid>
          </Stack>

          <Stack gap={1.5}>
            <Text fontSize="sm" fontWeight="semibold">
              Idioma
            </Text>
            <SimpleGrid columns={{ base: 1, md: 1 }} gap={4}>
              {languageOptions.map((option) => (
                <SelectableCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={language === option.value}
                  onClick={() => onLanguageChange?.(option.value)}
                  badge={option.badge}
                />
              ))}
            </SimpleGrid>
          </Stack>

          <Stack gap={1.5}>
            <Text fontSize="sm" fontWeight="semibold">
              Observações Adicionais
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <Stack gap={2}>
                <Text fontSize="sm" color="fg.muted">
                  Adicione comentários ou instruções extras que serão incluídos
                  no prompt do agente, complementando as configurações de
                  personalidade e estilo.
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Dica: use este campo para adicionar regras específicas do seu
                  negócio, contexto adicional ou orientações personalizadas.
                </Text>
              </Stack>

              <Textarea
                value={prompt}
                onChange={(e) => onPromptChange?.(e.target.value)}
                rows={10}
                resize="vertical"
                fontFamily="mono"
                fontSize="sm"
                placeholder="Adicione observações ou instruções adicionais para o agente..."
              />
            </SimpleGrid>
          </Stack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const AIAgentPersonalityCard = memo(
  AIAgentPersonalityCardBase
) as typeof AIAgentPersonalityCardBase

export { AIAgentPersonalityCard, type Props as AIAgentPersonalityCardProps }
