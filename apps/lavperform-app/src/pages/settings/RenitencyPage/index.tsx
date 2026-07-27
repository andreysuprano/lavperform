import { memo } from 'react'
import { LuTimer } from 'react-icons/lu'

import { AppContentLayout, RenitencyConfigView } from '@/components'
import { useAuth } from '@/context/AuthContext'

function RenitencyPageBase() {
  const { selectedCompany } = useAuth()

  return (
    <AppContentLayout
      icon={<LuTimer />}
      title="Renitência"
    >
      <RenitencyConfigView companyId={selectedCompany?.id} />
    </AppContentLayout>
  )
}

const RenitencyPage = memo(RenitencyPageBase) as typeof RenitencyPageBase

export { RenitencyPage }
