import { LuChartColumn } from 'react-icons/lu'

import { AppContentLayout, TrafficReportEmptyState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { isOnlyTrafficRead } from '@/utils/tracking/traffic-access'

export function TrafficReportPage() {
  const { selectedCompany } = useAuth()
  const canConfigure = !isOnlyTrafficRead(selectedCompany?.permissions)

  return (
    <AppContentLayout
      icon={<LuChartColumn />}
      title="Relatório de tráfego"
    >
      <TrafficReportEmptyState canConfigure={canConfigure} />
    </AppContentLayout>
  )
}
