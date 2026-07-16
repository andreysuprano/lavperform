import { useCallback, useMemo, useState } from 'react'
import { RiUserLine } from 'react-icons/ri'

import {
  AppContentLayout,
  CustomerMetricsSection,
  CustomerSummaryWidget,
} from '@/components'
import { CustomerTableSection } from '../DetailClientsPage'

export function CustomersPage() {
  const [selectedSegmentations, setSelectedSegmentations] = useState<string[]>(
    []
  )

  const handleSegmentationToggle = useCallback((segmentation: string) => {
    setSelectedSegmentations((prev) =>
      prev.includes(segmentation)
        ? prev.filter((s) => s !== segmentation)
        : [...prev, segmentation]
    )
  }, [])

  const rfvClassifications = useMemo(
    () =>
      selectedSegmentations.length > 0 ? selectedSegmentations : undefined,
    [selectedSegmentations]
  )

  return (
    <AppContentLayout
      icon={<RiUserLine />}
      title="Clientes"
    >
      <CustomerMetricsSection />
      <CustomerSummaryWidget
        onSegmentationToggle={handleSegmentationToggle}
        selectedSegmentations={selectedSegmentations}
      />
      <CustomerTableSection rfvClassifications={rfvClassifications} />
    </AppContentLayout>
  )
}
