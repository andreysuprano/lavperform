import { Alert, Box, Tabs, Text, useTabs } from '@chakra-ui/react'
import { useState } from 'react'
import { LuCoins } from 'react-icons/lu'

import { AppContentLayout } from '@/components'
import { BalanceCard } from '@/components/features/admin/credits/BalanceCard/BalanceCard'
import { CompanyCreditsSelector } from '@/components/features/admin/credits/CompanyCreditsSelector/CompanyCreditsSelector'
import { EffectiveProductList } from '@/components/features/admin/credits/effective-products/EffectiveProductList/EffectiveProductList'
import { LedgerList } from '@/components/features/admin/credits/ledger/LedgerList/LedgerList'
import { ProductList } from '@/components/features/admin/credits/products/ProductList/ProductList'
import { TopupList } from '@/components/features/admin/credits/topups/TopupList/TopupList'
import type { Company } from '@/types'

export function AdminCreditsPage() {
  const [companyId, setCompanyId] = useState('')
  const [company, setCompany] = useState<Company | undefined>()
  const tabs = useTabs({ defaultValue: 'balance' })

  return (
    <AppContentLayout
      icon={<LuCoins />}
      title="Créditos"
    >
      <CompanyCreditsSelector
        onCompanyChange={(selectedCompanyId, selectedCompany) => {
          setCompanyId(selectedCompanyId)
          setCompany(selectedCompany)
        }}
        selectedCompanyId={companyId}
      />

      {!companyId ? (
        <Alert.Root
          mt={4}
          status="info"
          variant="surface"
        >
          <Alert.Indicator />
          <Alert.Title>
            Selecione uma empresa para gerenciar créditos, produtos e recargas.
          </Alert.Title>
        </Alert.Root>
      ) : (
        <Box mt={5}>
          {company && (
            <Text
              color="fg.muted"
              fontSize="sm"
              mb={3}
            >
              Gerenciando créditos de <strong>{company.name}</strong>
            </Text>
          )}
          <Tabs.RootProvider value={tabs}>
            <Tabs.List mb={4}>
              <Tabs.Trigger value="balance">Saldo</Tabs.Trigger>
              <Tabs.Trigger value="products">Produtos</Tabs.Trigger>
              <Tabs.Trigger value="effective">Catálogo Efetivo</Tabs.Trigger>
              <Tabs.Trigger value="topups">Recargas</Tabs.Trigger>
              <Tabs.Trigger value="ledger">Histórico</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="balance">
              <BalanceCard companyId={companyId} />
            </Tabs.Content>
            <Tabs.Content value="products">
              <ProductList companyId={companyId} />
            </Tabs.Content>
            <Tabs.Content value="effective">
              <EffectiveProductList companyId={companyId} />
            </Tabs.Content>
            <Tabs.Content value="topups">
              <TopupList companyId={companyId} />
            </Tabs.Content>
            <Tabs.Content value="ledger">
              <LedgerList companyId={companyId} />
            </Tabs.Content>
          </Tabs.RootProvider>
        </Box>
      )}
    </AppContentLayout>
  )
}
