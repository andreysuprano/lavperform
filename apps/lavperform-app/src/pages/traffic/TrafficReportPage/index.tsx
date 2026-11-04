import { LuChartColumn } from 'react-icons/lu'

import { AppContentLayout } from '@/components'

export function TrafficReportPage() {
  return (
    <AppContentLayout
      icon={<LuChartColumn />}
      title="Relatório de tráfego"
    />
  )
}
