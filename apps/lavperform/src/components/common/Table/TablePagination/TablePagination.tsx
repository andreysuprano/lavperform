import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormatNumber,
  Group,
  HStack,
  IconButton,
  Pagination,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

import { Props } from './TablePagination.types'

const TablePaginationComponent = <T,>({
  data,
  meta,
  handleLimitChange,
  handlePageChange,
}: Props<T>) => {
  const pageSizes = useMemo(() => [5, 10, 20, 50], [])

  const renderPaginationItem = useMemo(
    () => (item: { value: number }) =>
      (
        <IconButton
          aria-label={`Página ${item.value}`}
          variant={{ base: 'ghost', _selected: 'solid' }}
        >
          {item.value}
        </IconButton>
      ),
    []
  )

  const handleSizeChange = useCallback(
    (size: number) => () => {
      handleLimitChange(size)
    },
    [handleLimitChange]
  )

  const handlePaginationChange = useCallback(
    (details: { page: number }) => {
      handlePageChange(details.page)
    },
    [handlePageChange]
  )

  const pageInfo = useMemo(() => {
    if ((meta?.total || 0) < 5) return { startItem: 0, endItem: 0 }

    const startItem =
      data.length > 0 ? ((meta?.page || 1) - 1) * (meta?.limit || 10) + 1 : 0
    const endItem = Math.min(
      (meta?.page || 1) * (meta?.limit || 10),
      meta?.total || 0
    )
    return { startItem, endItem }
  }, [data.length, meta?.page, meta?.limit, meta?.total])

  if ((meta?.total || 0) < 5) return null

  return (
    <Flex
      align="flex-end"
      flex={1}
      mt={4}
    >
      <Flex
        align="center"
        flex={1}
        flexDirection={{ base: 'column', lg: 'row' }}
        gap={4}
        justify={{ base: 'medium', lg: 'space-between' }}
      >
        <Flex
          align="center"
          gap="4"
        >
          <Text
            color="gray.500"
            display={{ base: 'none', xl: 'block' }}
            fontSize="sm"
            w="250px"
          >
            {`Mostrando ${pageInfo.startItem} a ${pageInfo.endItem} de `}
            <FormatNumber
              compactDisplay="short"
              notation="compact"
              value={meta?.total || 0}
            />{' '}
            registros
          </Text>
          <Box
            bg="bg"
            borderRadius="md"
            borderWidth={1}
            maxW="220px"
          >
            <HStack gap="2">
              <Text
                color="fg.muted"
                fontSize="2xs"
                textAlign="center"
              >
                Itens por página:
              </Text>
              <Group attached>
                {pageSizes.map((size) => (
                  <Button
                    borderWidth={0}
                    key={size}
                    onClick={handleSizeChange(size)}
                    size="xs"
                    variant={meta?.limit === size ? 'solid' : 'ghost'}
                  >
                    {size}
                  </Button>
                ))}
              </Group>
            </HStack>
          </Box>
        </Flex>
        <Pagination.Root
          bg="bg"
          borderRadius="md"
          borderWidth={1}
          count={meta?.total || 0}
          onPageChange={handlePaginationChange}
          page={meta?.page || 1}
          pageSize={meta?.limit || 10}
          siblingCount={1}
        >
          <ButtonGroup
            attached
            size="sm"
            variant="outline"
          >
            <Pagination.PrevTrigger asChild>
              <IconButton
                aria-label="Página anterior"
                disabled={meta?.page === 1}
                variant="ghost"
              >
                <RiArrowLeftSLine />
              </IconButton>
            </Pagination.PrevTrigger>
            <Pagination.Items render={renderPaginationItem} />
            <Pagination.NextTrigger asChild>
              <IconButton
                aria-label="Próxima página"
                disabled={meta?.page === meta?.totalPages}
                variant="ghost"
              >
                <RiArrowRightSLine />
              </IconButton>
            </Pagination.NextTrigger>
          </ButtonGroup>
        </Pagination.Root>
      </Flex>
    </Flex>
  )
}

const CustomTablePagination = memo(
  TablePaginationComponent
) as typeof TablePaginationComponent

export {
  CustomTablePagination as TablePagination,
  type Props as TablePaginationProps,
}
