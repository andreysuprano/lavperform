import { LuPlug } from 'react-icons/lu'

import { AppContentLayout, CompanyIntegrationList } from '@/components'

export const IntegrationPage = () => {
  return (
    <AppContentLayout
      icon={<LuPlug />}
      title="Integrações"
    >
      <CompanyIntegrationList />
    </AppContentLayout>
  )
}
