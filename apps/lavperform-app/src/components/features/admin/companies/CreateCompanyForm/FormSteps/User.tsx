import { Fieldset, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo } from 'react'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'

import { Input, PasswordInput } from '@/components'

import { type FormDataUser, schemaUser } from '../schema'
import type { FormStepsProps } from './FormSteps.types'

function UserComponent(props: FormStepsProps) {
  const { register, control, handleSubmit } = useForm<FormDataUser>({
    mode: 'onChange',
    resolver: yupResolver<FormDataUser, any, any>(schemaUser),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
    },
    values: {
      name: props.formData?.name || '',
      email: props.formData?.email || '',
      password: props.formData?.password || '',
      confirmPassword: props.formData?.password || '',
      phone: props.formData?.phone || '',
    },
  })

  const maskedRegister = useHookFormMask(register)

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
      <Fieldset.Root>
        <Fieldset.Content>
          <Input
            control={control}
            label="Nome completo"
            placeholder="Informe o nome completo"
            required
            {...register('name')}
          />
          <Input
            control={control}
            label="Telefone"
            placeholder="(99) 99999-9999"
            required
            type="tel"
            {...maskedRegister('phone', '(99) 99999-9999')}
          />
          <Input
            control={control}
            label="E-mail"
            placeholder="Informe um e-mail válido"
            type="email"
            {...register('email')}
          />
          <PasswordInput
            control={control}
            label="Senha"
            placeholder="Informe uma senha segura"
            required
            {...register('password')}
          />
          <PasswordInput
            control={control}
            label="Confirmar senha"
            placeholder="Confirme a senha"
            required
            {...register('confirmPassword')}
          />
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

const User = memo(UserComponent)

export { User }
