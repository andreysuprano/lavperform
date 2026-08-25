import {
  ButtonGroup,
  Flex,
  IconButton,
  Pagination,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

import { RECENT_SALES_PAGE_LIMIT } from '@/utils/orders/recentSales.constants'

import { Props } from './RecentSalesPagination.types'

function RecentSalesPaginationBase({ meta, onPageChange, pageSize }: Props) {
  const handlePaginationChange = useCallback(
    (details: { page: number }) => {
      onPageChange(details.page)
    },
    [onPageChange]
  )

  if (!meta || meta.totalPages <= 1) {
    return null
  }

  return (
    <Flex
      align="center"
      flexShrink={0}
      gap={2}
      justify="flex-end"
    >
      <Text
        color="fg.muted"
        fontSize="sm"
        whiteSpace="nowrap"
      >
        Página {meta.page} de {meta.totalPages}
      </Text>
      <Pagination.Root
        count={meta.total}
        onPageChange={handlePaginationChange}
        page={meta.page}
        pageSize={pageSize ?? RECENT_SALES_PAGE_LIMIT}
        siblingCount={0}
      >
        <ButtonGroup
          attached
          size="sm"
          variant="outline"
        >
          <Pagination.PrevTrigger asChild>
            <IconButton
              aria-label="Página anterior"
              disabled={!meta.hasPreviousPage}
              variant="ghost"
            >
              <RiArrowLeftSLine />
            </IconButton>
          </Pagination.PrevTrigger>
          <Pagination.NextTrigger asChild>
            <IconButton
              aria-label="Próxima página"
              disabled={!meta.hasNextPage}
              variant="ghost"
            >
              <RiArrowRightSLine />
            </IconButton>
          </Pagination.NextTrigger>
        </ButtonGroup>
      </Pagination.Root>
    </Flex>
  )
}

const RecentSalesPagination = memo(
  RecentSalesPaginationBase
) as typeof RecentSalesPaginationBase

export { RecentSalesPagination, type Props as RecentSalesPaginationProps }
