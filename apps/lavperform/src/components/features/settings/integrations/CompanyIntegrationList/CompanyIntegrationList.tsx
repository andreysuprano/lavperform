import { SimpleGrid, Stack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import {
  CompanyIntegrationForm,
  Empty,
  LoadingState,
  OpenApiIntegrationSection,
} from '@/components'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { integrationService } from '@/services'
import type { CompanyIntegration } from '@/types'
import { logger } from '@/utils/logger'
import { useWhitelabelActive } from '@/whitelabel/hooks'

export const CompanyIntegrationList = () => {
  const [integrations, setIntegrations] = useState<CompanyIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedCompany } = useAuth()
  const { features } = useWhiteLabel()
  const { isActive: isWhitelabelActive } = useWhitelabelActive()

  const fetchIntegrations = useCallback(async () => {
    if (!selectedCompany?.id) return

    setLoading(true)
    try {
      const { data } = await integrationService.getCompanyIntegration(
        selectedCompany.id
      )
      setIntegrations(data)
    } catch (err) {
      logger.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedCompany?.id])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  if (!selectedCompany) return null

  return (
    <Stack gap={4}>
      {<OpenApiIntegrationSection />}

      {loading ? (
        <LoadingState />
      ) : integrations.length === 0 ? (
        <Empty
          description="Nenhuma integração foi encontrada."
          title="Nenhuma integração encontrada"
        />
      ) : (
        <SimpleGrid
          columns={{ base: 1, md: 2, lg: 3, '2xl': 4 }}
          gap={4}
        >
          {integrations.map((integration) => {
            const defaultIntegration = integration.digitalMenuIntegrations[0]

            return (
              <CompanyIntegrationForm
                codigoLoja={defaultIntegration?.merchantId}
                key={integration.id}
                logo={integration.logoUrl}
                name={integration.name}
                onSuccess={fetchIntegrations}
                partnerId={integration.id}
                token={defaultIntegration?.apiKey}
                urlCardapio={
                  features.hasDelivery
                    ? defaultIntegration?.digitalMenuUrl
                    : undefined
                }
                webhook={
                  integration.baseUrlWebhook && selectedCompany.id
                    ? `${integration.baseUrlWebhook}${selectedCompany.id}`
                    : undefined
                }
              />
            )
          })}
        </SimpleGrid>
      )}
    </Stack>
  )
}
