import { Box, Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { HeroData } from '@/whitelabel/types'

import { HeroForm } from '@/whitelabel/components/landing-page-config/HeroForm'

function HeroPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const updateConfig = useUpdateLandingPageConfig()

  const [formData, setFormData] = useState<HeroData | null>(null)

  useEffect(() => {
    if (data) {
      setFormData(data.data.hero)
    }
  }, [data])

  const handleChange = useCallback((newData: HeroData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ hero: formData })
      toaster.create({
        title: 'Sucesso',
        description: 'Hero atualizado com sucesso! 🚀',
        type: 'success',
        closable: true,
        duration: 3000,
      })
    } catch {
      // Erro já tratado no hook
    }
  }, [formData, selectedCompany, updateConfig])

  if (isLoading || !canEdit) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Hero">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Hero">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        icon={<RiPagesLine />}
        title="Banner"
      >
        <HeroForm
          branding={data?.data.branding}
          data={formData}
          onChange={handleChange}
        />
      </AppContentLayout>

      <Box
        bg="none"
        bottom={0}
        left={0}
        mt={4}
        position="sticky"
        right={0}
        zIndex={10}
      >
        <Button
          loading={updateConfig.isPending}
          onClick={handleSave}
          size="lg"
          width="full"
        >
          <RiSaveLine />
          Salvar alterações
        </Button>
      </Box>
    </Stack>
  )
}

const HeroPage = memo(HeroPageBase)

export { HeroPage }
