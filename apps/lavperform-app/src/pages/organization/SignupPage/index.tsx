import { SignupPageLayout, SelfCreateCompanyWithPaymentForm } from '@/components'
import { getBusinessCopy } from '@/config'

export function SignupPage() {
  const copy = getBusinessCopy()

  return (
    <SignupPageLayout
      description="Você está a poucos passos de transformar clientes ocasionais em compradores recorrentes. Cadastre sua empresa, ative sua assinatura e comece a vender de novo com campanhas automáticas no WhatsApp."
      title={copy.registerWelcomeTitle}
    >
      <SelfCreateCompanyWithPaymentForm />
    </SignupPageLayout>
  )
}
