import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import iconEyeDark from '@/assets/login/icon-eye-dark.svg'
import iconEyeLight from '@/assets/login/icon-eye-light.svg'
import iconLockDark from '@/assets/login/icon-lock-dark.svg'
import iconLockLight from '@/assets/login/icon-lock-light.svg'
import iconMailDark from '@/assets/login/icon-mail-dark.svg'
import iconMailLight from '@/assets/login/icon-mail-light.svg'
import { toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'

import { type FormData, schema } from './schema'

function ThemeIcon({ dark, light }: { dark: string; light: string }) {
  return (
    <>
      <span className="login-icon-light">
        <img
          alt=""
          height={18}
          src={light}
          width={18}
        />
      </span>
      <span className="login-icon-dark">
        <img
          alt=""
          height={18}
          src={dark}
          width={18}
        />
      </span>
    </>
  )
}

function LoginForm() {
  const {
    register,
    formState: { errors, isSubmitted, isSubmitting, touchedFields },
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
  const [passwordVisible, setPasswordVisible] = useState(false)

  const showEmailError = !!errors.email && (touchedFields.email || isSubmitted)
  const showPasswordError =
    !!errors.password && (touchedFields.password || isSubmitted)

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
    <form
      className="login-form"
      onSubmit={handleSubmit(handleSave)}
    >
      <div className="login-fields">
        <div className="login-field">
          <label
            className="login-label"
            htmlFor="email"
          >
            E-mail
          </label>
          <div
            className="login-control"
            data-invalid={showEmailError ? 'true' : undefined}
          >
            <ThemeIcon
              dark={iconMailDark}
              light={iconMailLight}
            />
            <input
              aria-describedby={showEmailError ? 'email-error' : undefined}
              aria-invalid={showEmailError || undefined}
              autoComplete="email"
              className="login-input"
              id="email"
              type="email"
              {...register('email')}
            />
          </div>
          {showEmailError && (
            <p
              className="login-error"
              id="email-error"
            >
              {errors.email?.message}
            </p>
          )}
        </div>
        <div className="login-field">
          <label
            className="login-label"
            htmlFor="password"
          >
            Senha
          </label>
          <div
            className="login-control"
            data-invalid={showPasswordError ? 'true' : undefined}
          >
            <ThemeIcon
              dark={iconLockDark}
              light={iconLockLight}
            />
            <input
              aria-describedby={
                showPasswordError ? 'password-error' : undefined
              }
              aria-invalid={showPasswordError || undefined}
              autoComplete="current-password"
              className="login-input"
              data-masked={passwordVisible ? 'false' : 'true'}
              id="password"
              type={passwordVisible ? 'text' : 'password'}
              {...register('password')}
            />
            <button
              aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={passwordVisible}
              className="login-eye"
              onClick={() => setPasswordVisible((current) => !current)}
              type="button"
            >
              <ThemeIcon
                dark={iconEyeDark}
                light={iconEyeLight}
              />
            </button>
          </div>
          {showPasswordError && (
            <p
              className="login-error"
              id="password-error"
            >
              {errors.password?.message}
            </p>
          )}
        </div>
      </div>
      <div className="login-actions">
        <button
          className="login-submit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <Link
          className="login-forgot"
          to="/forgot-password"
        >
          Esqueci minha senha
        </Link>
      </div>
    </form>
  )
}

export { LoginForm }
