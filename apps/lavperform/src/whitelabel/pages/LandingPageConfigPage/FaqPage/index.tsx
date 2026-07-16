import { Box, Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { FaqData } from '@/whitelabel/types'

import { FaqForm } from '@/whitelabel/components/landing-page-config/FaqForm'

function FaqPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const updateConfig = useUpdateLandingPageConfig()

  const [formData, setFormData] = useState<FaqData | null>(null)

  useEffect(() => {
    if (data) {
      setFormData(data.data.faq)
    }
  }, [data])

  const handleChange = useCallback((newData: FaqData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ faq: formData })
    } catch {
      // Erro já tratado no hook
    }
  }, [formData, selectedCompany, updateConfig])

  if (isLoading || !canEdit) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="FAQ">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="FAQ">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        icon={<RiPagesLine />}
        title="FAQ"
      >
        <FaqForm
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

const FaqPage = memo(FaqPageBase)

export { FaqPage }
