import { Box, Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { FooterData } from '@/whitelabel/types'

import { FooterForm } from '@/whitelabel/components/landing-page-config/FooterForm'

function FooterPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const updateConfig = useUpdateLandingPageConfig()

  const [formData, setFormData] = useState<FooterData | null>(null)

  useEffect(() => {
    if (data) {
      setFormData(data.data.footer)
    }
  }, [data])

  const handleChange = useCallback((newData: FooterData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ footer: formData })
    } catch {
      // Erro já tratado no hook
    }
  }, [formData, selectedCompany, updateConfig])

  if (isLoading || !canEdit) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Rodapé">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Rodapé">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        icon={<RiPagesLine />}
        title="Rodapé"
      >
        <FooterForm
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

const FooterPage = memo(FooterPageBase)

export { FooterPage }
