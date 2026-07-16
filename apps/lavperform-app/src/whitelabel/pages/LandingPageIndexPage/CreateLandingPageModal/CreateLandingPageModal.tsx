import { Box, Button, Dialog } from '@chakra-ui/react'
import { memo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiSaveLine } from 'react-icons/ri'

import { CustomDialog, toaster } from '@/components'
import { useUpdateLandingPageConfig } from '@/whitelabel/hooks'
import type { BrandingData } from '@/whitelabel/types'

import { BrandingForm } from '@/whitelabel/components/landing-page-config/BrandingForm'

import { Props } from './CreateLandingPageModal.types'

const defaultBranding: BrandingData = {
  name: '',
  slogan: '',
  logo: '',
  primaryColor: '#000000',
  secondaryColor: '#000000',
  tertiaryColor: '#000000',
}

function CreateLandingPageModalBase({
  isOpen,
  onOpenChange,
  onSuccess,
}: Props) {
  const [branding, setBranding] = useState<BrandingData>(defaultBranding)
  const navigate = useNavigate()
  const updateConfig = useUpdateLandingPageConfig()

  const handleCreate = useCallback(() => {
    if (!branding.name?.trim()) {
      toaster.create({
        title: 'Campo obrigatório',
        description: 'Informe o nome da marca para continuar.',
        type: 'info',
        meta: { customStyle: 'yellowToast' },
      })
      return
    }

    updateConfig.mutate(
      { branding },
      {
        onSuccess: () => {
          onOpenChange({ open: false })
          onSuccess?.()
          navigate('/whitelabel/landing-page/branding')
        },
      }
    )
  }, [branding, navigate, onOpenChange, onSuccess, updateConfig])

  const handleOpenChange = useCallback(
    (details: { open: boolean }) => {
      if (!details.open) {
        setBranding(defaultBranding)
      }
      onOpenChange(details)
    },
    [onOpenChange]
  )

  return (
    <CustomDialog
      closeTrigger
      contentMaxW="min(960px, 95vw)"
      content={
        <Box
          overflowY="auto"
          maxH="min(85vh, 720px)"
          px={6}
        >
          <BrandingForm data={branding} onChange={setBranding} />
        </Box>
      }
      footer={
        <>
          <Dialog.ActionTrigger asChild>
            <Button
              variant="surface"
              onClick={() => handleOpenChange({ open: false })}
            >
              Cancelar
            </Button>
          </Dialog.ActionTrigger>
          <Button
            loading={updateConfig.isPending}
            disabled={updateConfig.isPending}
            onClick={handleCreate}
          >
            <RiSaveLine />
            Criar minha página
          </Button>
        </>
      }
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="Criar sua Landing Page"
    />
  )
}

const CreateLandingPageModal = memo(
  CreateLandingPageModalBase
) as typeof CreateLandingPageModalBase

export { CreateLandingPageModal, type Props as CreateLandingPageModalProps }
