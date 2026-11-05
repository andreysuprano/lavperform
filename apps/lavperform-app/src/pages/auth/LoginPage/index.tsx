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
        <h1
          className="login-sr-only"
          id="login-title"
        >
          Entrar
        </h1>
        <img
          alt="LavPerform"
          className="login-logo"
          height={36}
          src={logo}
          width={193}
        />
        <LoginForm />
      </section>
    </main>
  )
}
