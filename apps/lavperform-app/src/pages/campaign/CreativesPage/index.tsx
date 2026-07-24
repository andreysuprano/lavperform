import { Box, Button, Flex, Icon } from '@chakra-ui/react'
import { useState } from 'react'
import { LuLayoutTemplate, LuPlus } from 'react-icons/lu'
import { Link } from 'react-router-dom'

import { AppContentLayout, CustomDialog } from '@/components'
import { MetaTemplatesList } from '@/components/features/campaigns/meta-templates/MetaTemplatesList'
import { MetaTemplateWizard } from '@/components/features/campaigns/meta-templates/MetaTemplateWizard'
import { useAuth } from '@/context/AuthContext'
import { useMetaIntegrationAvailability } from '@/hooks/queries'

export function CreativesPage() {
  const { selectedCompany } = useAuth()
  const { data: metaAvailability, isLoading } = useMetaIntegrationAvailability(
    selectedCompany?.id
  )
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  if (isLoading) {
    return (
      <AppContentLayout
        icon={<LuLayoutTemplate />}
        title="Templates"
      >
        <Box>Carregando...</Box>
      </AppContentLayout>
    )
  }

  if (!metaAvailability?.available) {
    return (
      <AppContentLayout
        icon={<LuLayoutTemplate />}
        title="Templates"
      >
        <Box
          bg="bg"
          borderColor="border"
          borderRadius="lg"
          borderWidth="1px"
          p={6}
        >
          <Box fontWeight="semibold" mb={2}>
            API oficial não configurada
          </Box>
          <Box
            color="fg.muted"
            fontSize="sm"
          >
            Para gerenciar templates da Meta, conecte a API oficial do WhatsApp
            Business em Canais de Comunicação.
          </Box>
          <Link to="/channels/whatsapp-business-api">Ir para configuração</Link>
        </Box>
      </AppContentLayout>
    )
  }

  return (
    <AppContentLayout
      icon={<LuLayoutTemplate />}
      title="Templates"
    >
      <Flex
        justify="flex-end"
        mb={4}
      >
        <Button onClick={() => setIsWizardOpen(true)}>
          <Icon as={LuPlus} />
          Criar template
        </Button>
      </Flex>

      <MetaTemplatesList />

      {isWizardOpen && (
        <CustomDialog
          content={
            <Box p={6}>
              <MetaTemplateWizard
                onCancel={() => setIsWizardOpen(false)}
                onSuccess={() => setIsWizardOpen(false)}
              />
            </Box>
          }
          contentMaxW="4xl"
          isOpen
          onOpenChange={(details) => {
            if (!details.open) setIsWizardOpen(false)
          }}
          title="Criar template"
        />
      )}
    </AppContentLayout>
  )
}
