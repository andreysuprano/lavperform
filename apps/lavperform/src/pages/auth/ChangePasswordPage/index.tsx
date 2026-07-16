import { AuthPageLayout, ChangePasswordForm } from '@/components'

export function ChangePasswordPage() {
  return (
    <AuthPageLayout
      description="Valide o código enviado por e-mail e em seguida informe a nova senha!"
      title="Salvar nova senha!"
    >
      <ChangePasswordForm />
    </AuthPageLayout>
  )
}
