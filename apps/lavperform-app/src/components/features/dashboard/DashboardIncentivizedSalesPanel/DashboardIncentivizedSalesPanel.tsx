import {
  Box,
  Flex,
  FormatNumber,
  HStack,
  Icon,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useMemo, useState } from 'react'
import { LuShoppingBag, LuTrendingUp } from 'react-icons/lu'

import { useAuth } from '@/context/AuthContext'
import { useIncentivizedSales } from '@/hooks/queries'

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

function DashboardIncentivizedSalesPanelBase() {
  const { selectedCompany } = useAuth()
  const [filter, setFilter] = useState<FilterMode>('all')

  const params = useMemo(
    () => (filter === 'month' ? getCurrentMonthRange() : {}),
    [filter]
  )

  const { data, isLoading } = useIncentivizedSales(selectedCompany?.id, params)

  return (
    <Flex
      align="stretch"
      bg={{ base: 'whiteAlpha.100', _dark: 'blackAlpha.400' }}
      borderColor={{ base: 'whiteAlpha.200', _dark: 'whiteAlpha.100' }}
      borderRadius="lg"
      borderWidth="1px"
      flexDirection="column"
      flexShrink={0}
      gap={3}
      justify="space-between"
      maxW={{ md: '200px' }}
      minH={{ md: '168px' }}
      p={4}
      w={{ base: 'full', md: '200px' }}
    >
      <HStack
        gap={2}
        justify="space-between"
      >
        <Box
          bg="colorPalette.solid"
          borderRadius="md"
          color="gray.900"
          lineHeight={0}
          p={1.5}
        >
          <Icon boxSize={4}>
            <LuTrendingUp />
          </Icon>
        </Box>

        <HStack
          bg={{ base: 'blackAlpha.400', _dark: 'blackAlpha.500' }}
          borderRadius="md"
          gap={0}
          overflow="hidden"
        >
          {(['all', 'month'] as FilterMode[]).map((mode) => {
            const isActive = filter === mode
            return (
              <Box
                as="button"
                bg={isActive ? 'colorPalette.solid' : 'transparent'}
                color={isActive ? 'gray.900' : { base: 'whiteAlpha.700', _dark: 'fg.muted' }}
                cursor="pointer"
                fontSize="2xs"
                fontWeight={isActive ? 'bold' : 'medium'}
                key={mode}
                onClick={() => setFilter(mode)}
                px={2}
                py={1}
                transition="background 0.15s ease, color 0.15s ease"
                type="button"
              >
                {mode === 'all' ? 'Total' : 'Mês'}
              </Box>
            )
          })}
        </HStack>
      </HStack>

      <Stack gap={0.5}>
        <Text
          color={{ base: 'whiteAlpha.700', _dark: 'fg.muted' }}
          fontSize="2xs"
          fontWeight="semibold"
          letterSpacing="0.06em"
          textTransform="uppercase"
        >
          Vendas incentivadas
        </Text>

        {isLoading ? (
          <Skeleton
            borderRadius="md"
            height="28px"
            w="90%"
          />
        ) : (
          <Text
            color={{ base: 'fg.inverted', _dark: 'fg' }}
            fontSize="xl"
            fontVariantNumeric="tabular-nums"
            fontWeight="bold"
            letterSpacing="-0.02em"
            lineHeight="1.1"
          >
            <FormatNumber
              currency="BRL"
              maximumFractionDigits={0}
              minimumFractionDigits={0}
              style="currency"
              value={data?.totalValue ?? 0}
            />
          </Text>
        )}

        <Text
          color={{ base: 'whiteAlpha.600', _dark: 'fg.muted' }}
          fontSize="xs"
        >
          geradas pela plataforma
        </Text>
      </Stack>

      <HStack
        color={{ base: 'whiteAlpha.800', _dark: 'fg.muted' }}
        gap={1.5}
      >
        <Icon boxSize={3.5}>
          <LuShoppingBag />
        </Icon>
        {isLoading ? (
          <Skeleton
            height="14px"
            w="72px"
          />
        ) : (
          <Text
            fontSize="xs"
            fontWeight="medium"
          >
            <FormatNumber
              compactDisplay="short"
              notation="compact"
              value={data?.totalCount ?? 0}
            />{' '}
            {(data?.totalCount ?? 0) === 1 ? 'venda' : 'vendas'}
          </Text>
        )}
      </HStack>
    </Flex>
  )
}

const DashboardIncentivizedSalesPanel = memo(
  DashboardIncentivizedSalesPanelBase
) as typeof DashboardIncentivizedSalesPanelBase

export { DashboardIncentivizedSalesPanel }
