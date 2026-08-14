import {
  Box,
  Card,
  FormatNumber,
  HStack,
  Icon,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { useMemo, useState } from 'react'
import { LuShoppingBag, LuSparkles, LuTrendingUp } from 'react-icons/lu'

import { useAuth } from '@/context/AuthContext'
import { useIncentivizedSales } from '@/hooks/queries'

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

type FilterMode = 'all' | 'month'

function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${day}`,
  }
}

export function IncentivizedSalesCard() {
  const { selectedCompany } = useAuth()
  const [filter, setFilter] = useState<FilterMode>('all')

  const params = useMemo(
    () => (filter === 'month' ? getCurrentMonthRange() : {}),
    [filter]
  )

  const { data: allTimeData, isLoading: isLoadingAllTime } = useIncentivizedSales(
    selectedCompany?.id,
    {}
  )
  const { data, isLoading } = useIncentivizedSales(selectedCompany?.id, params)

  const hasAllTimeSales =
    (allTimeData?.totalCount ?? 0) > 0 || (allTimeData?.totalValue ?? 0) > 0

  if (!isLoadingAllTime && !hasAllTimeSales) {
    return null
  }

  return (
    <Card.Root
      overflow="hidden"
      position="relative"
      style={{
        background:
          'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
        border: '1px solid rgba(52, 211, 153, 0.25)',
        boxShadow:
          '0 4px 24px rgba(4, 120, 87, 0.3), inset 0 1px 0 rgba(52, 211, 153, 0.15)',
      }}
    >
      <Box
        aria-hidden
        borderRadius="full"
        opacity={0.08}
        pointerEvents="none"
        position="absolute"
        right="-48px"
        style={{
          width: '180px',
          height: '180px',
          top: '-60px',
          background: 'radial-gradient(circle, #34d399 0%, transparent 70%)',
        }}
      />
      <Box
        aria-hidden
        borderRadius="full"
        opacity={0.05}
        pointerEvents="none"
        position="absolute"
        style={{
          width: '120px',
          height: '120px',
          bottom: '-40px',
          left: '10%',
          background: 'radial-gradient(circle, #6ee7b7 0%, transparent 70%)',
        }}
      />

      <Card.Body px={6} py={4}>
        <HStack
          align="center"
          justify="space-between"
          wrap="wrap"
          gap={4}
        >
          {/* Label + ícone */}
          <HStack gap={3}>
            <Box
              borderRadius="lg"
              flexShrink={0}
              lineHeight={0}
              p={2}
              style={{
                background: 'rgba(52, 211, 153, 0.2)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
              }}
            >
              <Icon
                as={LuTrendingUp}
                color="green.200"
                size="md"
              />
            </Box>
            <VStack align="flex-start" gap={0}>
              <HStack gap={1}>
                <Icon as={LuSparkles} color="green.300" size="xs" />
                <Text
                  color="green.300"
                  fontSize="xs"
                  fontWeight="semibold"
                  letterSpacing="wider"
                  textTransform="uppercase"
                >
                  Vendas incentivadas pela plataforma
                </Text>
              </HStack>
            </VStack>
          </HStack>

          {/* Valores centralizados */}
          <HStack
            flex={1}
            gap={8}
            justify="center"
          >
            <VStack align="center" gap={0}>
              {isLoading ? (
                <Skeleton height="28px" width="120px" />
              ) : (
                <Text
                  fontWeight="bold"
                  letterSpacing="tight"
                  lineHeight={1}
                  style={{
                    fontSize: '1.5rem',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    backgroundImage:
                      'linear-gradient(90deg, #ffffff 0%, #d1fae5 50%, #ffffff 100%)',
                    backgroundSize: '200% auto',
                    animation: `${shimmer} 4s linear infinite`,
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  <FormatNumber
                    currency="BRL"
                    maximumFractionDigits={2}
                    minimumFractionDigits={2}
                    style="currency"
                    value={data?.totalValue ?? 0}
                  />
                </Text>
              )}
              <Text color="green.400" fontSize="xs" mt={0.5}>
                em valor gerado
              </Text>
            </VStack>

            <Box
              alignSelf="stretch"
              style={{ width: '1px', background: 'rgba(52, 211, 153, 0.2)' }}
            />

            <VStack align="center" gap={0}>
              {isLoading ? (
                <Skeleton height="28px" width="50px" />
              ) : (
                <HStack align="baseline" gap={1}>
                  <Icon as={LuShoppingBag} color="green.300" size="sm" />
                  <Text
                    color="white"
                    fontSize="lg"
                    fontWeight="bold"
                    letterSpacing="tight"
                  >
                    <FormatNumber
                      compactDisplay="short"
                      notation="compact"
                      value={data?.totalCount ?? 0}
                    />
                  </Text>
                </HStack>
              )}
              <Text color="green.400" fontSize="xs" mt={0.5}>
                vendas geradas
              </Text>
            </VStack>
          </HStack>

          {/* Toggle filtro */}
          <HStack
            borderRadius="full"
            gap={0}
            overflow="hidden"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
            }}
          >
            {(['all', 'month'] as FilterMode[]).map((mode) => {
              const isActive = filter === mode
              return (
                <Box
                  as="button"
                  cursor="pointer"
                  key={mode}
                  onClick={() => setFilter(mode)}
                  px={3}
                  py={1.5}
                  style={{
                    background: isActive
                      ? 'rgba(52, 211, 153, 0.25)'
                      : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <Text
                    color={isActive ? 'green.200' : 'green.500'}
                    fontSize="xs"
                    fontWeight={isActive ? 'semibold' : 'normal'}
                  >
                    {mode === 'all' ? 'Total' : 'Este mês'}
                  </Text>
                </Box>
              )
            })}
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
