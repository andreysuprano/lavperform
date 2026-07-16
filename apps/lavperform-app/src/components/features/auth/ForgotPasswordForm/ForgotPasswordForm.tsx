import { Button, Fieldset, Link, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Input, toaster } from '@/components'
import { authService } from '@/services'

import { type FormData, schema } from './schema'

function ForgotPasswordForm() {
  const {
    register,
    formState: { isSubmitting },
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      email: '',
    },
  })

  const emailValue = watch('email')

  const navigate = useNavigate()

  const handleSave = async (values: FormData) => {
    try {
      await authService.forgotPassword({ email: values.email })

      navigate(`/change-password?email=${emailValue}`)

      reset()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível solicitar o código de recuperação de senha.'

      toaster.create({
        title: 'Erro ao solicitar troca de senha',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  return (
    <Stack
      as="form"
      gap={6}
      onSubmit={handleSubmit(handleSave)}
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <Input
            control={control}
            label="E-mail"
            placeholder="Informe seu e-mail de cadastro"
            type="email"
            {...register('email')}
          />
        </Fieldset.Content>
      </Fieldset.Root>
      <Button
        loading={isSubmitting}
        loadingText="Solicitando troca..."
        type="submit"
      >
        Solicitar troca de senha
      </Button>
      <Link
        color="primary"
        fontSize="sm"
        fontWeight="medium"
        href="/"
        justifyContent="flex-end"
      >
        Voltar ao login
      </Link>
    </Stack>
  )
}

export { ForgotPasswordForm }
