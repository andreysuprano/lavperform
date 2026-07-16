import { useEffect, useMemo, useRef, useState } from 'react'

import {
  RFV_SEGMENT_COLORS,
  RFV_SEGMENT_POSITIONS,
} from '@/utils/constants/rfvMatrix'
import type { RfvMatrixData } from '@/types'
import {
  calculateRfvGridLayout,
  type TreemapLayoutNode,
  type TreemapNode,
} from '@/utils/rfvTreemapLayout'

interface UseRfvMatrixLayoutProps {
  data: RfvMatrixData | undefined
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useRfvMatrixLayout({
  data,
  containerRef,
}: UseRfvMatrixLayoutProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  const treemapNodes = useMemo((): TreemapNode[] => {
    if (!data) return []

    const totalCount = RFV_SEGMENT_POSITIONS.reduce((sum, position) => {
      const segmentData = data[position.key]
      return sum + (segmentData?.count || 0)
    }, 0)

    return RFV_SEGMENT_POSITIONS.map((position) => {
      const segmentData = data[position.key]
      const count = segmentData?.count || 0
      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0

      return {
        key: position.key,
        label: position.label,
        count,
        percentage,
        color: RFV_SEGMENT_COLORS[position.key],
      }
    })
  }, [data])

  const layout = useMemo((): TreemapLayoutNode[] => {
    if (treemapNodes.length === 0) return []
    return calculateRfvGridLayout(
      treemapNodes,
      RFV_SEGMENT_POSITIONS,
      dimensions.width,
      dimensions.height
    )
  }, [treemapNodes, dimensions.width, dimensions.height])

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({
          width: Math.max(1, width - 2),
          height: Math.max(1, height - 2),
        })
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({
        width: Math.max(1, rect.width - 2),
        height: Math.max(1, rect.height - 2),
      })
    }
  }, [containerRef])

  return {
    layout,
    dimensions,
    containerRef,
  }
}
