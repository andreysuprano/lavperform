import { Box, Tabs, useTabs } from '@chakra-ui/react'
import { LuWallet } from 'react-icons/lu'

import { AppContentLayout } from '@/components'
import { BalanceCard } from '@/components/features/admin/credits/BalanceCard/BalanceCard'
import { EffectiveProductList } from '@/components/features/admin/credits/effective-products/EffectiveProductList/EffectiveProductList'
import { LedgerList } from '@/components/features/admin/credits/ledger/LedgerList/LedgerList'
import { TopupList } from '@/components/features/admin/credits/topups/TopupList/TopupList'
import { useAuth } from '@/context/AuthContext'

export function WalletPage() {
  const { selectedCompany } = useAuth()
  const tabs = useTabs({ defaultValue: 'balance' })
  const companyId = selectedCompany?.id ?? ''

  return (
    <AppContentLayout
      icon={<LuWallet />}
      title="Minha Carteira"
    >
      <Box mt={2}>
        <Tabs.RootProvider value={tabs}>
          <Tabs.List mb={4}>
            <Tabs.Trigger value="balance">Saldo</Tabs.Trigger>
            <Tabs.Trigger value="effective">Catálogo</Tabs.Trigger>
            <Tabs.Trigger value="topups">Recargas</Tabs.Trigger>
            <Tabs.Trigger value="ledger">Histórico</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="balance">
            <BalanceCard
              companyId={companyId}
              showTopup
            />
          </Tabs.Content>
          <Tabs.Content value="effective">
            <EffectiveProductList
              companyId={companyId}
              hideCode
            />
          </Tabs.Content>
          <Tabs.Content value="topups">
            <TopupList
              companyId={companyId}
              readOnly
            />
          </Tabs.Content>
          <Tabs.Content value="ledger">
            <LedgerList
              compact
              companyId={companyId}
            />
          </Tabs.Content>
        </Tabs.RootProvider>
      </Box>
    </AppContentLayout>
  )
}
