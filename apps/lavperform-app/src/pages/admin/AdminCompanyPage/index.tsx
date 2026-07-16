import { PiBuildings } from 'react-icons/pi'

import { AppContentLayout, CompanyList } from '@/components'

export function AdminCompanyPage() {
  return (
    <AppContentLayout
      icon={<PiBuildings />}
      title="Empresas"
    >
      <CompanyList />
    </AppContentLayout>
  )
}
