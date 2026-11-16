import './login-screen.css'

import logo from '@/assets/login/logo.png'
import { LoginForm } from '@/components/features/auth/LoginForm/LoginForm'

export function LoginPage() {
  return (
    <main className="login-screen">
      <div
        aria-hidden="true"
        className="login-glow-layer"
      >
        <div className="login-glow login-glow-primary" />
        <div className="login-glow login-glow-deep" />
      </div>
      <section
        aria-labelledby="login-title"
        className="login-card"
      >
        <img
          alt="LavPerform"
          className="login-logo"
          height={36}
          src={logo}
          width={193}
        />
        <h1
          className="login-title"
          id="login-title"
        >
          Entrar na sua conta
        </h1>
        <LoginForm />
      </section>
    </main>
  )
}
