import { Box, Tabs } from '@chakra-ui/react'
import { useState } from 'react'
import { LuLayoutTemplate, LuPlus } from 'react-icons/lu'
import { Link } from 'react-router-dom'

import { AppContentLayout } from '@/components'
import { CreateMetaTemplateForm } from '@/components/features/campaigns/meta-templates/CreateMetaTemplateForm'
import { MetaTemplatesList } from '@/components/features/campaigns/meta-templates/MetaTemplatesList'
import { useAuth } from '@/context/AuthContext'
import { useMetaIntegrationAvailability } from '@/hooks/queries'

export function CreativesPage() {
  const { selectedCompany } = useAuth()
  const { data: metaAvailability, isLoading } = useMetaIntegrationAvailability(
    selectedCompany?.id
  )
  const [activeTab, setActiveTab] = useState('list')

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
      <Tabs.Root
        onValueChange={(details) => setActiveTab(details.value)}
        value={activeTab}
      >
        <Tabs.List mb={4}>
          <Tabs.Trigger value="list">
            <LuLayoutTemplate />
            Templates
          </Tabs.Trigger>
          <Tabs.Trigger value="create">
            <LuPlus />
            Criar template
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="list">
          <MetaTemplatesList />
        </Tabs.Content>

        <Tabs.Content value="create">
          <CreateMetaTemplateForm
            onSuccess={() => setActiveTab('list')}
          />
        </Tabs.Content>
      </Tabs.Root>
    </AppContentLayout>
  )
}
