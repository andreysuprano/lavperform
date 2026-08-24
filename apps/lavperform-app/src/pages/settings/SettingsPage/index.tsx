import { RiSettings4Line } from 'react-icons/ri'

import {
  AppContentLayout,
  CompanyDaysAndHoursOfOperationViewCard,
  CompanyInformationViewCard,
  DashboardPreferencesCard,
} from '@/components'

export const SettingsPage = () => {
  return (
    <AppContentLayout
      icon={<RiSettings4Line />}
      title="Ajustes"
    >
      <CompanyInformationViewCard />
      <DashboardPreferencesCard />
      <CompanyDaysAndHoursOfOperationViewCard />
    </AppContentLayout>
  )
}
