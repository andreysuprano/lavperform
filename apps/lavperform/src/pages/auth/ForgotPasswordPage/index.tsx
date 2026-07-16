import { AuthPageLayout, ForgotPasswordForm } from '@/components'

export function ForgotPasswordPage() {
  return (
    <AuthPageLayout
      description="Solicite a troca de senha informando o seu e-mail no campo abaixo!"
      title="Esqueceu sua senha?"
    >
      <ForgotPasswordForm />
    </AuthPageLayout>
  )
}
