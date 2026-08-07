import { Button, Stack, Text, VStack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiPagesLine, RiArrowRightLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { TemplatePicker } from '@/whitelabel/components/landing-page-config/TemplatePicker'
import {
  useLandingPageConfig,
  useUpdateLandingPageConfig,
} from '@/whitelabel/hooks'
import type { LandingPageTemplate } from '@/whitelabel/types'

import { LandingPageEmptyState } from './LandingPageEmptyState'

function LandingPageIndexPageBase() {
  const { data, isLoading, isError } = useLandingPageConfig()
  const updateConfig = useUpdateLandingPageConfig()
  const navigate = useNavigate()

  const [selectedTemplate, setSelectedTemplate] =
    useState<LandingPageTemplate>('default')

  useEffect(() => {
    if (data?.template) {
      setSelectedTemplate(data.template)
    }
  }, [data?.template])

  const persistedTemplate = data?.template ?? 'default'
  const isDirty = selectedTemplate !== persistedTemplate

  const handleSaveTemplate = useCallback(async () => {
    if (!isDirty) return

    try {
      await updateConfig.mutateAsync({ template: selectedTemplate })
    } catch {
      // Erro já tratado no hook
    }
  }, [isDirty, selectedTemplate, updateConfig])

  if (isLoading) {
    return (
      <AppContentLayout
        icon={<RiPagesLine />}
        title="Landing Page"
      >
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  if (isError || !data) {
    return <LandingPageEmptyState />
  }

  const sections = [
    { label: 'Branding', path: '/whitelabel/landing-page/branding', description: 'Nome, logo e slogan da marca' },
    { label: 'Banner', path: '/whitelabel/landing-page/hero', description: 'Título, imagem de fundo e CTA principal' },
    { label: 'Serviços', path: '/whitelabel/landing-page/services', description: 'Lista de serviços oferecidos' },
    { label: 'Localização', path: '/whitelabel/landing-page/location', description: 'Endereço e mapa' },
    { label: 'FAQ', path: '/whitelabel/landing-page/faq', description: 'Perguntas frequentes' },
    { label: 'Avaliações', path: '/whitelabel/landing-page/testimonials', description: 'Depoimentos de clientes' },
    { label: 'CTA Final', path: '/whitelabel/landing-page/cta', description: 'Call-to-action final' },
    { label: 'Rodapé', path: '/whitelabel/landing-page/footer', description: 'Informações do rodapé' },
  ]

  return (
    <AppContentLayout
      icon={<RiPagesLine />}
      title="Customização de Landing Page"
    >
      <VStack gap={6} alignItems="stretch">
        <Text color="fg.muted">
          Personalize cada seção da sua Landing Page. Clique em uma seção para começar a editar.
        </Text>

        <TemplatePicker
          isDirty={isDirty}
          isSaving={updateConfig.isPending}
          onChange={setSelectedTemplate}
          onSave={handleSaveTemplate}
          value={selectedTemplate}
        />

        <Stack gap={3}>
          {sections.map((section) => (
            <Button
              key={section.path}
              justifyContent="space-between"
              onClick={() => navigate(section.path)}
              variant="outline"
              w="full"
            >
              <VStack alignItems="flex-start" gap={0}>
                <Text fontWeight="semibold">{section.label}</Text>
                <Text color="fg.muted" fontSize="sm">
                  {section.description}
                </Text>
              </VStack>
              <RiArrowRightLine />
            </Button>
          ))}
        </Stack>
      </VStack>
    </AppContentLayout>
  )
}

const LandingPageIndexPage = memo(LandingPageIndexPageBase)

export { LandingPageIndexPage }
