import { Table } from '@chakra-ui/react'
import { memo } from 'react'

import { Empty, LoadingState } from '@/components'

import { Props } from './Table.types'
import { TablePagination } from './TablePagination/TablePagination'

function TableComponent<T>({
  children,
  css,
  data,
  emptyStateMessage,
  header,
  isLoading,
  maxHeight,
  stickyFirstColumn,
  ...rest
}: Props<T>) {
  if (!data || data.length === 0) {
    return <Empty description={emptyStateMessage} />
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <>
      <Table.ScrollArea
        borderRadius={10}
        borderWidth="1px"
        maxH={maxHeight}
        overflowY={maxHeight ? 'auto' : undefined}
      >
        <Table.Root
          css={{
            ...(css || {}),
            ...(stickyFirstColumn
              ? {
                  '& th:first-of-type, & td:first-of-type': {
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: 'var(--chakra-colors-bg)',
                  },
                  '& thead th:first-of-type': {
                    zIndex: 2,
                  },
                }
              : {}),
          }}
          interactive
          showColumnBorder
          size="md"
          stickyHeader
        >
          <Table.Header>
            <Table.Row
              background="bg.muted"
              height="48px"
            >
              {header}
            </Table.Row>
          </Table.Header>
          <Table.Body>{children}</Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      <TablePagination<T>
        data={data}
        {...rest}
      />
    </>
  )
}

const CustomTable = memo(TableComponent) as typeof TableComponent

export { CustomTable, type Props as CustomTableProps }
