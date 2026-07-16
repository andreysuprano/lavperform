import { Flex, Heading, Skeleton, Stack, Text } from '@chakra-ui/react'
import { memo, useState } from 'react'

import { Empty } from '@/components/common'
import { useRecentSales } from '@/hooks/queries'
import { RECENT_SALES_PAGE_LIMIT } from '@/utils/orders/recentSales.constants'

import { RecentSaleCard } from './RecentSaleCard'
import { RecentSalesPagination } from './RecentSalesPagination'
import { Props } from './RecentSalesPanel.types'

function RecentSalesSkeleton() {
  return (
    <Stack gap={2}>
      {Array.from({ length: RECENT_SALES_PAGE_LIMIT }).map((_, index) => (
        <Skeleton
          key={index}
          borderRadius="md"
          height="40px"
        />
      ))}
    </Stack>
  )
}

function RecentSalesPanelBase({ companyId }: Props) {
  const [page, setPage] = useState(1)

  const { data, isError, isLoading } = useRecentSales(companyId, {
    page,
    limit: RECENT_SALES_PAGE_LIMIT,
  })

  const sales = data?.sales ?? []
  const meta = data?.meta
  const hasItems = sales.length > 0

  return (
    <Stack
      gap={3}
      h="full"
    >
      <Stack gap={1}>
        <Flex
          align={{ base: 'flex-start', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: 2, md: 3 }}
          justify="space-between"
          w="full"
        >
          <Heading
            flexShrink={0}
            size="lg"
          >
            Últimas Vendas
          </Heading>
          {!isLoading && !isError && (
            <RecentSalesPagination
              meta={meta}
              onPageChange={setPage}
            />
          )}
        </Flex>
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          Acompanhe as vendas mais recentes da operação.
        </Text>
      </Stack>

      {isLoading ? (
        <RecentSalesSkeleton />
      ) : isError ? (
        <Empty
          description="Não foi possível carregar as últimas vendas no momento."
          title="Erro ao carregar vendas"
        />
      ) : hasItems ? (
        <Stack gap={2}>
          {sales.map((sale) => (
            <RecentSaleCard
              key={sale.id}
              sale={sale}
            />
          ))}
        </Stack>
      ) : (
        <Empty title="Nenhuma venda recente encontrada" />
      )}
    </Stack>
  )
}

const RecentSalesPanel = memo(RecentSalesPanelBase) as typeof RecentSalesPanelBase

export { RecentSalesPanel, type Props as RecentSalesPanelProps }
