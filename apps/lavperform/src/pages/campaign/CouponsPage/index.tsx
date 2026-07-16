import { RiCoupon3Line } from 'react-icons/ri'

import { AppContentLayout, CompanyCouponsList } from '@/components'

export const CouponsPage = () => {
  return (
    <AppContentLayout
      icon={<RiCoupon3Line />}
      title="Cupons"
    >
      <CompanyCouponsList />
    </AppContentLayout>
  )
}
