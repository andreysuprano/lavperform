import type { RfvMatrixData, RfvSegmentPosition } from '@/types'

export interface TreemapNode {
  key: keyof RfvMatrixData
  label: string
  count: number
  percentage: number
  color: string
}

export interface TreemapLayoutNode extends TreemapNode {
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
}

interface GridRegion {
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
  segments: Array<{
    node: TreemapNode
    position: RfvSegmentPosition
  }>
}

function worstRatio(
  row: TreemapNode[],
  dimension: number,
  totalArea: number,
  totalSize: number,
  vertical: boolean
): number {
  if (row.length === 0) return Infinity

  const rowSize = row.reduce((sum, node) => sum + node.percentage, 0)
  const rowArea = (rowSize / totalSize) * totalArea
  const rowLength = rowArea / dimension

  let maxRatio = 0

  for (const node of row) {
    const nodeArea = (node.percentage / totalSize) * totalArea
    const nodeLength = nodeArea / rowLength
    const nodeWidth = vertical ? dimension : nodeLength
    const nodeHeight = vertical ? nodeLength : dimension
    const ratio = Math.max(nodeWidth / nodeHeight, nodeHeight / nodeWidth)
    maxRatio = Math.max(maxRatio, ratio)
  }

  return maxRatio
}

/**
 * Algoritmo Squarified Treemap
 * Distribui segmentos tentando manter blocos o mais "quadrados" possível
 * Garante preenchimento 100% do espaço sem gaps
 */
function squarify(
  nodes: TreemapNode[],
  row: TreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  totalArea: number,
  totalSize: number,
  vertical: boolean
): TreemapLayoutNode[] {
  if (nodes.length === 0) {
    return layoutRow(row, x, y, width, height, totalArea, totalSize, vertical)
  }

  const node = nodes[0]
  const extendedRow = [...row, node]

  const currentDimension = vertical ? height : width
  const currentRatio = worstRatio(row, currentDimension, totalArea, totalSize, vertical)
  const extendedRatio = worstRatio(extendedRow, currentDimension, totalArea, totalSize, vertical)

  if (row.length === 0 || currentRatio >= extendedRatio) {
    return squarify(
      nodes.slice(1),
      extendedRow,
      x,
      y,
      width,
      height,
      totalArea,
      totalSize,
      vertical
    )
  } else {
    const rowLayout = layoutRow(
      row,
      x,
      y,
      width,
      height,
      totalArea,
      totalSize,
      vertical
    )

    const rowSize = row.reduce((sum, node) => sum + node.percentage, 0)
    const rowArea = (rowSize / totalSize) * totalArea
    const fixedDimension = vertical ? width : height
    const usedLength = rowArea / fixedDimension

    const newX = vertical ? x : x + usedLength
    const newY = vertical ? y + usedLength : y
    const newWidth = vertical ? width : width - usedLength
    const newHeight = vertical ? height - usedLength : height

    const remainingLayout = squarify(
      nodes,
      [],
      newX,
      newY,
      newWidth,
      newHeight,
      totalArea,
      totalSize,
      !vertical
    )

    return [...rowLayout, ...remainingLayout]
  }
}

function layoutRow(
  row: TreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  totalArea: number,
  totalSize: number,
  vertical: boolean
): TreemapLayoutNode[] {
  if (row.length === 0) return []

  const rowSize = row.reduce((sum, node) => sum + node.percentage, 0)
  const rowArea = (rowSize / totalSize) * totalArea
  const fixedDimension = vertical ? width : height
  const rowLength = rowArea / fixedDimension

  const layout: TreemapLayoutNode[] = []
  let currentPos = vertical ? y : x

  for (const node of row) {
    const nodeArea = (node.percentage / totalSize) * totalArea
    const nodeLength = nodeArea / fixedDimension

    if (vertical) {
      layout.push({
        ...node,
        x,
        y: currentPos,
        width: fixedDimension,
        height: nodeLength,
      })
      currentPos += nodeLength
    } else {
      layout.push({
        ...node,
        x: currentPos,
        y,
        width: nodeLength,
        height: fixedDimension,
      })
      currentPos += nodeLength
    }
  }

  return layout
}

export function calculateTreemapLayout(
  nodes: TreemapNode[],
  containerWidth: number,
  containerHeight: number
): TreemapLayoutNode[] {
  if (nodes.length === 0) return []

  const sorted = [...nodes].sort((a, b) => b.percentage - a.percentage)
  const totalArea = containerWidth * containerHeight
  const totalSize = sorted.reduce((sum, node) => sum + node.percentage, 0)
  const vertical = containerWidth < containerHeight

  return squarify(
    sorted,
    [],
    0,
    0,
    containerWidth,
    containerHeight,
    totalArea,
    totalSize,
    vertical
  )
}

function calculateGridCellDimensions(
  containerWidth: number,
  containerHeight: number
): { cellWidth: number; cellHeight: number } {
  return {
    cellWidth: containerWidth / 5,
    cellHeight: containerHeight / 5,
  }
}

function mapSegmentsToRegions(
  nodes: TreemapNode[],
  positions: RfvSegmentPosition[]
): GridRegion[] {
  const regionMap = new Map<string, GridRegion>()

  for (const node of nodes) {
    const position = positions.find((p) => p.key === node.key)
    if (!position) continue

    const rowStart = position.gridRow
    const rowEnd = position.gridRowEnd || position.gridRow + 1
    const colStart = position.gridColumn
    const colEnd = position.gridColumnEnd || position.gridColumn + 1

    const regionKey = `${rowStart}-${rowEnd}-${colStart}-${colEnd}`

    let region = regionMap.get(regionKey)
    if (!region) {
      region = {
        rowStart,
        rowEnd,
        colStart,
        colEnd,
        segments: [],
      }
      regionMap.set(regionKey, region)
    }

    region.segments.push({ node, position })
  }

  return Array.from(regionMap.values())
}

function distributeSegmentsInRegion(
  segments: Array<{ node: TreemapNode; position: RfvSegmentPosition }>,
  region: GridRegion,
  cellWidth: number,
  cellHeight: number
): TreemapLayoutNode[] {
  if (segments.length === 0) return []

  const regionWidth = (region.colEnd - region.colStart) * cellWidth
  const regionHeight = (region.rowEnd - region.rowStart) * cellHeight
  const regionArea = regionWidth * regionHeight
  const regionX = (region.colStart - 1) * cellWidth
  const regionY = (region.rowStart - 1) * cellHeight

  if (segments.length === 1) {
    const { node } = segments[0]
    return [
      {
        ...node,
        x: regionX,
        y: regionY,
        width: regionWidth,
        height: regionHeight,
      },
    ]
  }

  const sorted = [...segments]
    .map(({ node }) => node)
    .sort((a, b) => b.percentage - a.percentage)

  const totalSize = sorted.reduce((sum, node) => sum + node.percentage, 0)
  const vertical = regionWidth < regionHeight

  return squarify(
    sorted,
    [],
    regionX,
    regionY,
    regionWidth,
    regionHeight,
    regionArea,
    totalSize,
    vertical
  )
}

function calculateSegmentPositionInRegion(
  node: TreemapNode,
  position: RfvSegmentPosition,
  region: GridRegion,
  cellWidth: number,
  cellHeight: number,
  totalArea: number
): TreemapLayoutNode {
  const regionWidth = (region.colEnd - region.colStart) * cellWidth
  const regionHeight = (region.rowEnd - region.rowStart) * cellHeight
  const regionX = (region.colStart - 1) * cellWidth
  const regionY = (region.rowStart - 1) * cellHeight

  return {
    ...node,
    x: regionX,
    y: regionY,
    width: regionWidth,
    height: regionHeight,
  }
}

export function calculateRfvGridLayout(
  nodes: TreemapNode[],
  positions: RfvSegmentPosition[],
  containerWidth: number,
  containerHeight: number
): TreemapLayoutNode[] {
  if (nodes.length === 0 || positions.length === 0) return []

  const { cellWidth, cellHeight } = calculateGridCellDimensions(
    containerWidth,
    containerHeight
  )

  const regions = mapSegmentsToRegions(nodes, positions)
  const totalArea = containerWidth * containerHeight
  const layout: TreemapLayoutNode[] = []

  for (const region of regions) {
    if (region.segments.length === 0) continue

    if (region.segments.length === 1) {
      const { node, position } = region.segments[0]
      const segmentLayout = calculateSegmentPositionInRegion(
        node,
        position,
        region,
        cellWidth,
        cellHeight,
        totalArea
      )
      layout.push(segmentLayout)
    } else {
      const segmentLayouts = distributeSegmentsInRegion(
        region.segments,
        region,
        cellWidth,
        cellHeight
      )
      layout.push(...segmentLayouts)
    }
  }

  interface NodeWithArea extends TreemapLayoutNode {
    area: number
  }

  const layoutWithArea: NodeWithArea[] = layout.map((node) => ({
    ...node,
    area: node.width * node.height,
  }))

  const sortedByArea = [...layoutWithArea].sort((a, b) => a.area - b.area)

  const layoutWithZIndex: TreemapLayoutNode[] = layoutWithArea.map((node) => {
    const index = sortedByArea.findIndex((n) => n.key === node.key)
    return {
      ...node,
      zIndex: sortedByArea.length - index,
    }
  })

  return layoutWithZIndex
}
