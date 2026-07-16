import { Fieldset, Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { Input, Textarea } from '@/components/forms'

import type { Props } from './AIAgentWizardStep1.types'

function AIAgentWizardStep1Base({ control }: Props) {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Dados básicos</Fieldset.Legend>
      <Fieldset.HelperText>
        Defina o nome e a descrição do seu agente. Essas informações ajudam a
        identificar o agente e seu propósito.
      </Fieldset.HelperText>
      <Fieldset.Content>
        <Stack gap={4}>
          <Input
            control={control}
            name="name"
            label="Nome do agente"
            placeholder="Ex: Assistente de vendas"
            required
          />
          <Textarea
            control={control}
            name="description"
            label="Descrição"
            placeholder="Descreva o objetivo principal deste agente..."
            rows={4}
            required
          />
        </Stack>
      </Fieldset.Content>
    </Fieldset.Root>
  )
}

const AIAgentWizardStep1 = memo(
  AIAgentWizardStep1Base
) as typeof AIAgentWizardStep1Base

export { AIAgentWizardStep1, type Props as AIAgentWizardStep1Props }
