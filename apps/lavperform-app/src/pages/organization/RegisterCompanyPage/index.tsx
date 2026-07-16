import { RegisterPageLayout, SelfCreateCompanyForm } from '@/components'

export function RegisterCompanyPage() {
  return (
    <RegisterPageLayout
      description="Esse é o primeiro passo para você fazer parte do ecossistema que mais gera vendas para restaurantes no Brasil."
      title="Bem-vindo a FoodCRM!"
    >
      <SelfCreateCompanyForm />
    </RegisterPageLayout>
  )
}
