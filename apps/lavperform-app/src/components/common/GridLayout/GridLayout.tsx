import { SimpleGrid } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './GridLayout.types'

export function GridComponent<T>({
  items,
  renderItem,
  columns,
  gap = 4,
}: Props<T>) {
  return (
    <SimpleGrid
      columns={columns}
      gap={gap}
    >
      {items.map((item, index) => renderItem(item, index))}
    </SimpleGrid>
  )
}

const GridLayout = memo(GridComponent) as typeof GridComponent

export { GridLayout, type Props as GridLayoutProps }
