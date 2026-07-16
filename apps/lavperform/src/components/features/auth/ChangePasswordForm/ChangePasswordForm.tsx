import {
  Button,
  Field,
  Fieldset,
  Link,
  PinInput,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { PasswordInput, toaster } from '@/components'
import { authService } from '@/services'

import { type FormData, schema } from './schema'

function ChangePasswordForm() {
  const {
    register,
    formState: { isSubmitting, errors },
    control,
    handleSubmit,
    reset,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      code: [],
      password: '',
      confirmPassword: '',
    },
  })

  const [timeLeft, setTimeLeft] = useState(60)
  const [isButtonDisabled, setIsButtonDisabled] = useState(true)

  const [email, setEmail] = useState('')

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)

    const emailParam = searchParams.get('email')

    if (emailParam) {
      setEmail(emailParam)
    }
  }, [])

  const navigate = useNavigate()

  const handleSave = async (values: FormData) => {
    try {
      await authService.confirmCode({
        code: values.code.join(''),
        password: values.password,
      })

      navigate('/')

      reset()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toaster.create({
        title: 'Erro ao trocar senha',
        description: 'Por favor, tente novamente em alguns instantes.',
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  async function handleResendCode() {
    try {
      await authService.forgotPassword({ email })

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toaster.create({
        title: 'Erro ao solicitar novo código',
        description: 'Por favor, tente novamente em alguns instantes.',
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsButtonDisabled(false)
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft((prevTime) => prevTime - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft])

  return (
    <Stack
      as="form"
      gap={6}
      onSubmit={handleSubmit(handleSave)}
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <Field.Root
            invalid={!!errors.code}
            required
          >
            <Field.Label htmlFor="code">
              Código enviado no seu e-mail
              <Field.RequiredIndicator />
            </Field.Label>
            <Controller
              control={control}
              name="code"
              render={({ field }) => (
                <PinInput.Root
                  onValueChange={(e) => field.onChange(e.value)}
                  required={false}
                  value={field.value}
                >
                  <PinInput.HiddenInput />
                  <PinInput.Control>
                    <PinInput.Input index={0} />
                    <PinInput.Input index={1} />
                    <PinInput.Input index={2} />
                    <PinInput.Input index={3} />
                    <PinInput.Input index={4} />
                  </PinInput.Control>
                </PinInput.Root>
              )}
            />
            {!!errors.code && (
              <Field.ErrorText>{errors?.code.message}</Field.ErrorText>
            )}
          </Field.Root>
          <PasswordInput
            control={control}
            label="Nova senha"
            placeholder="Informe a nova senha"
            required
            {...register('password')}
          />
          <PasswordInput
            control={control}
            label="Confirmar a nova senha"
            placeholder="Confirme a nova senha"
            required
            {...register('confirmPassword')}
          />
        </Fieldset.Content>
      </Fieldset.Root>
      <Button
        loading={isSubmitting}
        loadingText="Trocando senha..."
        type="submit"
      >
        Trocar senha
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
      {!!email && (
        <>
          <Text>Não recebeu o código?</Text>
          <Button
            disabled={isButtonDisabled}
            onClick={handleResendCode}
            variant={'outline'}
          >
            Reenviar código
            {timeLeft > 0 && ` (${timeLeft})`}
          </Button>
        </>
      )}
    </Stack>
  )
}

export { ChangePasswordForm }
