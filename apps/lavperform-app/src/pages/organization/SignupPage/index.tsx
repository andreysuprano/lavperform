import { SignupPageLayout, SelfCreateCompanyWithPaymentForm } from '@/components'

export function SignupPage() {
  return (
    <SignupPageLayout
      description="Você está a poucos passos de transformar clientes ocasionais em compradores recorrentes. Cadastre sua empresa, ative sua assinatura e comece a vender de novo com campanhas automáticas no WhatsApp."
      title="Bem-vindo ao FoodCRM"
    >
      <SelfCreateCompanyWithPaymentForm />
    </SignupPageLayout>
  )
}
