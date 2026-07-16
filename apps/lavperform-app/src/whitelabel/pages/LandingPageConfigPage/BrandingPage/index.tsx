import { Box, Button, Link, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { LuExternalLink } from 'react-icons/lu'
import { RiPagesLine, RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  usePublicLandingPage,
  useRequireLandingPage,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import { buildLandingPageUrl } from '@/whitelabel/utils/landingPageUrl'
import type { BrandingData } from '@/whitelabel/types'

import { BrandingForm } from '@/whitelabel/components/landing-page-config/BrandingForm'

function BrandingPageBase() {
  const { selectedCompany } = useAuth()
  const { canEdit, isLoading, data } = useRequireLandingPage()
  const updateConfig = useUpdateLandingPageConfig()
  const { data: publicLandingPageData } = usePublicLandingPage(
    selectedCompany?.id || ''
  )

  const [formData, setFormData] = useState<BrandingData | null>(null)

  const landingPageUrl = publicLandingPageData
    ? buildLandingPageUrl(
        publicLandingPageData.customDomain,
        publicLandingPageData.slug
      )
    : null

  useEffect(() => {
    if (data) {
      setFormData(data.data.branding)
    }
  }, [data])

  const handleChange = useCallback((newData: BrandingData) => {
    setFormData(newData)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData || !selectedCompany) return

    try {
      await updateConfig.mutateAsync({ branding: formData })
      toaster.create({
        title: 'Sucesso',
        description: 'Identidade da marca atualizada com sucesso! 🎉',
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
      <AppContentLayout icon={<RiPagesLine />} title="Branding">
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (!formData) {
    return (
      <AppContentLayout icon={<RiPagesLine />} title="Branding">
        <LoadingState title="Carregando dados..." />
      </AppContentLayout>
    )
  }

  return (
    <Stack gap={0}>
      <AppContentLayout
        action={
          landingPageUrl ? (
            <Button
              asChild
              size="xs"
            >
              <Link
                href={landingPageUrl}
                target="_blank"
                unstyled
              >
                Acessar minha página <LuExternalLink />
              </Link>
            </Button>
          ) : undefined
        }
        icon={<RiPagesLine />}
        title="Branding"
      >
        <BrandingForm
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

const BrandingPage = memo(BrandingPageBase)

export { BrandingPage }
