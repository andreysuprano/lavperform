import { RegisterPageLayout, SelfCreateCompanyForm } from '@/components'
import { getBusinessCopy } from '@/config'

export function RegisterCompanyPage() {
  const copy = getBusinessCopy()

  return (
    <RegisterPageLayout
      description={copy.registerWelcomeDescription}
      title={`${copy.registerWelcomeTitle}!`}
    >
      <SelfCreateCompanyForm />
    </RegisterPageLayout>
  )
}
