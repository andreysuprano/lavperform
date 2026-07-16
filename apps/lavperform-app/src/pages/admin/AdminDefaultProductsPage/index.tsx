import { LuCoins } from 'react-icons/lu'

import { AppContentLayout } from '@/components'
import { DefaultProductList } from '@/components/features/admin/credits'

export function AdminDefaultProductsPage() {
  return (
    <AppContentLayout
      icon={<LuCoins />}
      title="Produtos Default de Crédito"
    >
      <DefaultProductList />
    </AppContentLayout>
  )
}
