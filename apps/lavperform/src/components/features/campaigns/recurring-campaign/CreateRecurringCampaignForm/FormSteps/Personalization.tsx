import { Stack, Text } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import { Textarea } from '@/components'

import { FormStepsProps } from './FormSteps.types'

const schema = yup.object({
  messageText: yup
    .string()
    .required('Informe a comunicação')
    .max(500, 'A comunicação deve ter no máximo 500 caracteres'),
})

type FormData = yup.InferType<typeof schema>

export function Personalization(props: FormStepsProps) {
  const { register, control, handleSubmit, watch } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      messageText: '',
    },
  })

  const messageTextValue = watch('messageText')

  const onSubmit = async (data: any) => {
    props.onSubmit?.(data)
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Textarea
        control={control}
        label={`Comunicação da campanha (${messageTextValue.length}/500)`}
        placeholder="Digite a comunicação da campanha"
        required
        resize="vertical"
        rows={4}
        {...register('messageText')}
      />
      <Text
        color="fg.muted"
        mt={-2}
      >
        Exemplifique a comunicação que será usada na campanha para
        contextualizar a IA.
      </Text>
    </Stack>
  )
}
