import { Button, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { StickySaveBar } from '@/components/layout/AppLayout/StickySaveBar'
import { useAuth } from '@/context/AuthContext'
import { useCompany } from '@/hooks/queries'
import { CtaForm } from '@/whitelabel/components/landing-page-config/CtaForm'
import {
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { CtaData } from '@/whitelabel/types'
import { withWhatsappDefaults } from '@/whitelabel/utils'

function CtaPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const companyQuery = useCompany(selectedCompany?.id)
  const updateConfig = useUpdateLandingPageConfig()
  const waitingCompany =
    !!selectedCompany?.id && companyQuery.isPending && !companyQuery.isError

  const [formData, setFormData] = useState<CtaData | null>(null)

  useEffect(() => {
    if (!data || waitingCompany || formData) return
    setFormData(withWhatsappDefaults(data.data.cta, companyQuery.data?.phone))
  }, [companyQuery.data?.phone, data, formData, waitingCompany])

  const handleChange = useCallback((newData: CtaData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ cta: formData })
    } catch {
      // Erro já tratado no hook
    }
  }, [formData, selectedCompany, updateConfig])

  if (isLoading || waitingCompany || !canEdit) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="CTA e WhatsApp">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="CTA e WhatsApp">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        icon={<RiPagesLine />}
        title="CTA e WhatsApp"
      >
        <CtaForm
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

const CtaPage = memo(CtaPageBase)

export { CtaPage }
