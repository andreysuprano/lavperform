import { Box } from '@chakra-ui/react'
import { memo } from 'react'

import type { TreemapLayoutNode } from '@/utils/rfvTreemapLayout'

import { RfvMatrixCell } from './RfvMatrixCell'

interface Props {
  layout: TreemapLayoutNode[]
  containerRef: React.RefObject<HTMLDivElement | null>
}

function RfvMatrixTreemapBase({ layout, containerRef }: Props) {
  return (
    <Box
      h={{ base: '250px', md: '350px', lg: '450px', xl: '500px' }}
      minH={{ base: '250px', md: '350px' }}
      minW={0}
      overflow="hidden"
      position="relative"
      ref={containerRef}
      style={{ zIndex: 1 }}
      w="full"
    >
      {layout.map((node) => (
        <RfvMatrixCell
          key={node.key}
          color={node.color}
          count={node.count}
          height={node.height}
          label={node.label}
          percentage={node.percentage}
          segmentKey={node.key}
          width={node.width}
          x={node.x}
          y={node.y}
          zIndex={node.zIndex}
        />
      ))}
    </Box>
  )
}

const RfvMatrixTreemap = memo(RfvMatrixTreemapBase) as typeof RfvMatrixTreemapBase

export { RfvMatrixTreemap }
