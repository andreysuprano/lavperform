import { Text } from '@chakra-ui/react'
import { LuChartColumn } from 'react-icons/lu'

import { AppContentLayout } from '@/components'

export function TrafficReportPage() {
  return (
    <AppContentLayout
      icon={<LuChartColumn />}
      title="Relatório de tráfego"
    >
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        Relatório de anúncios em breve
      </Text>
    </AppContentLayout>
  )
}
