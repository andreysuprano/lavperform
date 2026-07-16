import { AuthPageLayout, LoginForm } from '@/components'

export function LoginPage() {
  return (
    <AuthPageLayout
      description="Faça login para acessar sua conta e gerenciar suas atividades."
      title="Acesse sua conta"
    >
      <LoginForm />
    </AuthPageLayout>
  )
}
