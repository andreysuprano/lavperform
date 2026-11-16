import { Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { StickySaveBar } from '@/components/layout/AppLayout/StickySaveBar'
import { useAuth } from '@/context/AuthContext'
import { LocationForm } from '@/whitelabel/components/landing-page-config/LocationForm'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { LocationData } from '@/whitelabel/types'
import { normalizeLocationData } from '@/whitelabel/utils'

function LocationPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const updateConfig = useUpdateLandingPageConfig()

  const [formData, setFormData] = useState<LocationData | null>(null)

  useEffect(() => {
    if (data) {
      setFormData(normalizeLocationData(data.data.location))
    }
  }, [data])

  const handleChange = useCallback((newData: LocationData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ location: formData })
    } catch {
      // Erro já tratado no hook
    }
  }, [formData, selectedCompany, updateConfig])

  if (isLoading || !canEdit) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Localização">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Localização">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        icon={<RiPagesLine />}
        title="Unidades"
      >
        <LocationForm
          branding={data?.data.branding}
          data={formData}
          onChange={handleChange}
        />
      </AppContentLayout>

      <StickySaveBar>
        <Button
          loading={updateConfig.isPending}
          onClick={handleSave}
          size="lg"
          width="full"
        >
          <RiSaveLine />
          Salvar alterações
        </Button>
      </StickySaveBar>
    </Stack>
  )
}

const LocationPage = memo(LocationPageBase)

export { LocationPage }
