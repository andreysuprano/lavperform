import { Button, Fieldset, Link, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Input, PasswordInput, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'

import { type FormData, schema } from './schema'

function LoginForm() {
  const {
    register,
    formState: { isSubmitting },
    control,
    handleSubmit,
    reset,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { signIn } = useAuth()

  const navigate = useNavigate()

  const handleSave = async (values: FormData) => {
    try {
      await signIn({
        email: values.email,
        password: values.password,
      })

      navigate('/')

      reset()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toaster.create({
        title: 'Erro ao realizar login',
        description: 'Email ou senha incorretos. Por favor, tente novamente.',
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
            placeholder="Informe um e-mail válido"
            type="email"
            {...register('email')}
          />
          <PasswordInput
            control={control}
            label="Senha"
            placeholder="Informe a senha"
            required
            {...register('password')}
          />
          <Link
            color="primary"
            fontSize="sm"
            fontWeight="medium"
            href="/forgot-password"
            justifyContent="flex-end"
          >
            Esqueceu a senha?
          </Link>
        </Fieldset.Content>
      </Fieldset.Root>
      <Button
        loading={isSubmitting}
        loadingText="Entrando..."
        type="submit"
      >
        Entrar
      </Button>
    </Stack>
  )
}

export { LoginForm }
