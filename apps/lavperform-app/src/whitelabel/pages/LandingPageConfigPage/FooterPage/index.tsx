import { Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { StickySaveBar } from '@/components/layout/AppLayout/StickySaveBar'
import { useAuth } from '@/context/AuthContext'
import { FooterForm } from '@/whitelabel/components/landing-page-config/FooterForm'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { FooterData } from '@/whitelabel/types'

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

const FooterPage = memo(FooterPageBase)

export { FooterPage }
