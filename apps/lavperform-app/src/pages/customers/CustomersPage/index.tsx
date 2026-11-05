import { Stack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { RiUserLine } from 'react-icons/ri'

import {
  AppContentLayout,
  CustomerSummaryWidget,
} from '@/components'
import { useShellMode } from '@/components/layout/AppLayout/useShellMode'

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
  const phone = useShellMode() === 'phone'
  const segments = (
    <CustomerSummaryWidget
      onSegmentationToggle={handleSegmentationToggle}
      selectedSegmentations={selectedSegmentations}
    />
  )

  return (
    <AppContentLayout
      icon={<RiUserLine />}
      title="Clientes"
    >
      <Stack gap={4}>
        {phone ? null : segments}
        <CustomerTableSection
          filterExtra={phone ? segments : undefined}
          rfvClassifications={rfvClassifications}
        />
      </Stack>
    </AppContentLayout>
  )
}
