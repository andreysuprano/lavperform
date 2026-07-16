import { memo } from 'react'
import { RiUserCommunityLine } from 'react-icons/ri'

import { AppContentLayout } from '@/components'
import { RFVConfigContainer } from '@/components/features/customers/RfvConfig'
import { useAuth } from '@/context/AuthContext'

function RfvAttributionWindowPageBase() {
  const { selectedCompany } = useAuth()

  return (
    <AppContentLayout
      icon={<RiUserCommunityLine />}
      title="Parâmetros Matriz"
    >
      <RFVConfigContainer companyId={selectedCompany?.id} />
    </AppContentLayout>
  )
}

const RfvAttributionWindowPage = memo(
  RfvAttributionWindowPageBase
) as typeof RfvAttributionWindowPageBase

export { RfvAttributionWindowPage }

