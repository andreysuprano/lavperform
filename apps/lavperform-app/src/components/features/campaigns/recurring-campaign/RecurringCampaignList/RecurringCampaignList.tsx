import { Box, Button, Flex, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Fragment, useEffect, useMemo, useState } from 'react'

import { Empty } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCampaigns } from '@/hooks/queries'
import type { RecurringCampaign } from '@/types'

import { CreateRecurringCampaignForm } from '../CreateRecurringCampaignForm/CreateRecurringCampaignForm'
import { EditRecurringCampaignForm } from '../EditRecurringCampaignForm/EditRecurringCampaignForm'
import { RecurringCampaignDetailsView } from '../RecurringCampaignDetailsView/RecurringCampaignDetailsView'
import { RecurringCampaignItemCard } from '../RecurringCampaignItemCard/RecurringCampaignItemCard'
import { RecurringCampaignListFilters } from './RecurringCampaignListFilters'
import { RecurringCampaignListSkeleton } from './RecurringCampaignListSkeleton'
import {
  createDefaultCampaignFilters,
  filterCampaigns,
  hasActiveCampaignFilters,
  sortCampaignsByCreatedAtDesc,
  type RecurringCampaignListFilters as CampaignListFilters,
} from './recurringCampaignList.utils'

function RecurringCampaignList() {
  const { selectedCompany } = useAuth()

  const [selectedCampaign, setSelectedCampaign] =
    useState<RecurringCampaign | null>(null)
  const [selectedEditCampaign, setSelectedEditCampaign] =
    useState<RecurringCampaign | null>(null)
  const [filters, setFilters] = useState<CampaignListFilters | null>(
    null
  )
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  const { data, isLoading } = useCampaigns(selectedCompany?.id)

  const allCampaigns = useMemo(
    () => sortCampaignsByCreatedAtDesc(data?.data ?? []),
    [data?.data]
  )

  useEffect(() => {
    setFilters(null)
    setFiltersInitialized(false)
  }, [selectedCompany?.id])

  useEffect(() => {
    if (isLoading || filtersInitialized) return

    setFilters(createDefaultCampaignFilters(allCampaigns))
    setFiltersInitialized(true)
  }, [allCampaigns, filtersInitialized, isLoading])

  const filteredCampaigns = useMemo(() => {
    if (!filters) return []
    return filterCampaigns(allCampaigns, filters)
  }, [allCampaigns, filters])

  if (isLoading || !filters) {
    return <RecurringCampaignListSkeleton />
  }

  if (allCampaigns.length === 0) {
    return (
      <Stack
        align="center"
        gap={4}
      >
        <Empty
          description="Crie uma nova campanha clicando no botão abaixo"
          title="Nenhuma campanha encontrada"
        />
        <CreateRecurringCampaignForm />
      </Stack>
    )
  }

  return (
    <>
      <Stack gap={4}>
        <Flex
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={3}
          justify={{ base: 'flex-start', md: 'space-between' }}
          wrap="wrap"
        >
          <RecurringCampaignListFilters
            campaigns={allCampaigns}
            filters={filters}
            onChange={setFilters}
          />
          <Box flexShrink={0}>
            <CreateRecurringCampaignForm />
          </Box>
        </Flex>

        {filteredCampaigns.length === 0 ? (
          <Stack
            align="center"
            gap={3}
            py={8}
          >
            <Empty
              description="Ajuste ou limpe os filtros para ver outras campanhas."
              title="Nenhuma campanha encontrada com os filtros selecionados"
            />
            {hasActiveCampaignFilters(filters) && (
              <Button
                onClick={() =>
                  setFilters({
                    active: [],
                    channel: [],
                    status: [],
                  })
                }
                size="sm"
                variant="outline"
              >
                Limpar filtros
              </Button>
            )}
          </Stack>
        ) : (
          <>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              {filteredCampaigns.length}{' '}
              {filteredCampaigns.length === 1 ? 'campanha' : 'campanhas'}
            </Text>
            <SimpleGrid
              columns={{ base: 1, lg: 2, xl: 3, '2xl': 4 }}
              gap={3}
              w="full"
            >
              {filteredCampaigns.map((item) => (
                <Fragment key={item.id}>
                  <RecurringCampaignItemCard
                    data={item}
                    onEdit={() => setSelectedEditCampaign(item)}
                    onViewDetails={() => setSelectedCampaign(item)}
                  />
                </Fragment>
              ))}
            </SimpleGrid>
          </>
        )}
      </Stack>

      {selectedCampaign && (
        <RecurringCampaignDetailsView
          data={selectedCampaign}
          onClose={() => {
            setSelectedCampaign(null)
          }}
        />
      )}
      {selectedEditCampaign && (
        <EditRecurringCampaignForm
          campaignData={selectedEditCampaign}
          onClose={() => {
            setSelectedEditCampaign(null)
          }}
        />
      )}
    </>
  )
}

export { RecurringCampaignList }
