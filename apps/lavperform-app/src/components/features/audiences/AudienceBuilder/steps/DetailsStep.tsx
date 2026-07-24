import { Field, Input, Stack, Textarea } from '@chakra-ui/react'

import { StepIntro } from '../CriterionEditor'

type Props = {
  name: string
  description: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
}

export function DetailsStep({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: Props) {
  return (
    <Stack gap={4}>
      <StepIntro
        description="Dê um nome fácil de lembrar. Assim fica simples achar essa lista depois, nas campanhas."
        title="Como você quer chamar essa audiência?"
      />

      <Field.Root required>
        <Field.Label>Nome da audiência</Field.Label>
        <Input
          onChange={(event) => onNameChange(event.currentTarget.value)}
          placeholder="Ex: Clientes do Centro que sumiram"
          value={name}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Descrição</Field.Label>
        <Textarea
          onChange={(event) => onDescriptionChange(event.currentTarget.value)}
          placeholder="Opcional — anote para que serve essa lista"
          rows={3}
          value={description}
        />
      </Field.Root>
    </Stack>
  )
}
