import { Fieldset, Stack } from '@chakra-ui/react'
import { memo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { Input, Textarea } from '@/components/forms'

import { Props } from './CtaForm.types'

function CtaFormBase({ data, onChange }: Props) {
  const { control, watch } = useForm({
    defaultValues: data,
  })

  const watchedData = watch()
  const onChangeRef = useRef(onChange)
  const previousDataRef = useRef<string>('')

  // Atualizar ref sempre que onChange mudar
  onChangeRef.current = onChange

  useEffect(() => {
    const currentDataString = JSON.stringify(watchedData)
    // Só chama onChange se os dados realmente mudaram
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(watchedData)
    }
  }, [watchedData])

  return (
    <Stack gap={6}>
      <Fieldset.Root>
        <Fieldset.Legend>Call to Action Final</Fieldset.Legend>
        <Fieldset.Content>
          <Input
            control={control}
            label="Título"
            name="title"
            placeholder="Ex: Pronto para Experimentar?"
            required
          />

          <Textarea
            control={control}
            label="Descrição"
            name="description"
            placeholder="Digite a descrição"
            rows={3}
          />

          <Input
            control={control}
            label="Texto do botão"
            name="buttonText"
            placeholder="Ex: Solicitar Atendimento"
            required
          />

          <Input
            control={control}
            label="Número do WhatsApp (apenas números)"
            name="whatsappNumber"
            placeholder="5548999999999"
            required
          />
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

const CtaForm = memo(CtaFormBase) as typeof CtaFormBase

export { CtaForm, type Props as CtaFormProps }
