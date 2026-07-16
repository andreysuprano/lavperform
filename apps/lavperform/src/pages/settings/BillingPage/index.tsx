import { LuDollarSign } from 'react-icons/lu'

import {
  AppContentLayout,
  BillingPage as BillingPageComponent,
} from '@/components'

export const BillingPage = () => {
  return (
    <AppContentLayout
      icon={<LuDollarSign />}
      title="Financeiro"
    >
      <BillingPageComponent />
    </AppContentLayout>
  )
}
