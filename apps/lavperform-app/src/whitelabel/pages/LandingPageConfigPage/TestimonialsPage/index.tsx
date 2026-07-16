import { Box, Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { TestimonialsData } from '@/whitelabel/types'

import { TestimonialsForm } from '@/whitelabel/components/landing-page-config/TestimonialsForm'

function TestimonialsPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const updateConfig = useUpdateLandingPageConfig()

  const [formData, setFormData] = useState<TestimonialsData | null>(null)

  useEffect(() => {
    if (data) {
      setFormData(data.data.testimonials)
    }
  }, [data])

  const handleChange = useCallback((newData: TestimonialsData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ testimonials: formData })
    } catch {
      // Erro já tratado no hook
    }
  }, [formData, selectedCompany, updateConfig])

  if (isLoading || !canEdit) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Avaliações">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Avaliações">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        icon={<RiPagesLine />}
        title="Avaliações"
      >
        <TestimonialsForm
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

const TestimonialsPage = memo(TestimonialsPageBase)

export { TestimonialsPage }
