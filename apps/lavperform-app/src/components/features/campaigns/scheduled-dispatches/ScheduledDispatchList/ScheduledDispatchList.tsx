import {
  Badge,
  Center,
  Flex,
  Input,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  CreateScheduledDispatchForm,
  CustomTable,
  EditScheduledDispatchForm,
  ZoomableImage,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { convertLinkToResizedImage } from '@/firebase/storage'
import { useScheduledDispatchCampaigns } from '@/hooks/queries'
import { useAudiences } from '@/hooks/queries/useAudiences'
import { useCustomSendLists } from '@/hooks/queries/useCustomSendLists'
import type { ScheduledDispatchCampaign } from '@/types'
import { resolveCampaignTargetingFromApi } from '@/utils/campaigns/resolveCampaignTargetingFromApi'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { formatDate } from '@/utils/strings'

const formatStatus = (status: string) => {
  const statusConfig = {
    WAITING: { color: 'info', text: 'Aguardando' },
    COMPLETED: { color: 'green', text: 'Enviado' },
    PROCESSING: { color: 'yellow', text: 'Processando' },
    FAILED: { color: 'red', text: 'Falhou' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'gray',
    text: status,
  }

  return (
    <Badge
      colorPalette={config.color}
      variant="solid"
    >
      {config.text}
    </Badge>
  )
}

function targetingBadgeLabels(
  campaign: ScheduledDispatchCampaign,
  audiences: { id: string; name: string }[] = [],
  lists: { id: string; name: string }[] = [],
) {
  const targeting = resolveCampaignTargetingFromApi(campaign)

  if (targeting.targetingMode === 'AUDIENCE') {
    const audienceName = audiences.find(
      (audience) => audience.id === targeting.audienceId,
    )?.name
    return audienceName ? [audienceName] : []
  }

  if (targeting.targetingMode === 'CUSTOMER_LIST') {
    const listName = lists.find((list) => list.id === targeting.customSendListId)?.name
    return listName ? [listName] : []
  }

  return targeting.segmentation.map(
    (segmentationItem) =>
      clientTypesOptions.items.find((option) => option.value === segmentationItem)
        ?.label ?? segmentationItem,
  )
}

function ScheduledDispatchList() {
  const { selectedCompany } = useAuth()
  const { data: audiencesResult } = useAudiences(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })
  const { data: customSendListsResult } = useCustomSendLists(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })

  const [selectedCampaign, setSelectedCampaign] =
    useState<ScheduledDispatchCampaign | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    orderBy: 'createdAt',
    orderDirection: 'desc' as 'asc' | 'desc',
  })

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearchQuery])

  const queryParams = useMemo(
    () => ({
      page: params.page,
      limit: params.limit,
      orderDirection: params.orderDirection,
      ...(debouncedSearchQuery && { name: debouncedSearchQuery }),
    }),
    [params, debouncedSearchQuery]
  )

  const { data, isLoading } = useScheduledDispatchCampaigns(
    selectedCompany?.id,
    queryParams
  )

  const campaigns = data?.data ?? []
  const meta = data?.meta
    ? {
        ...data.meta,
        hasNextPage: data.meta.page < data.meta.totalPages,
        hasPreviousPage: data.meta.page > 1,
      }
    : undefined

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }))
  }, [])

  const handleLimitChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  return (
    <>
      <Flex
        align="center"
        flexDirection={{ base: 'column', md: 'row' }}
        gap="4"
        justify="space-between"
        mb="4"
      >
        <Input
          bg="bg"
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Pesquisar campanha..."
          value={searchQuery}
        />
        {/* TODO: Adicionar filtro por Status */}
        <CreateScheduledDispatchForm
          onClose={() => {
            setSelectedCampaign(null)
          }}
        />
      </Flex>
      <CustomTable<ScheduledDispatchCampaign>
        data={campaigns}
        emptyStateMessage="Adicione um novo disparo programado clicando no botão 'Novo disparo'"
        handleLimitChange={handleLimitChange}
        handlePageChange={handlePageChange}
        header={
          <>
            <Table.ColumnHeader>Mídia</Table.ColumnHeader>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>Segmentação</Table.ColumnHeader>
            <Table.ColumnHeader>Envios</Table.ColumnHeader>
            <Table.ColumnHeader>Vendas</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Data de Envio</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={meta}
      >
        {campaigns.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => setSelectedCampaign(item)}
          >
            <Table.Cell
              minW={90}
              w={90}
            >
              <Center>
                {item.imageUrl?.startsWith('http') ? (
                  <ZoomableImage
                    alt={item.name}
                    src={convertLinkToResizedImage(item.imageUrl)}
                  />
                ) : null}
              </Center>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{item.name}</Text>
            </Table.Cell>
            <Table.Cell>
              <VStack
                alignItems="flex-start"
                gap={2}
              >
                {targetingBadgeLabels(
                  item,
                  audiencesResult?.data,
                  customSendListsResult?.data,
                ).map((label) => (
                  <Badge
                    key={label}
                    variant="solid"
                  >
                    {label}
                  </Badge>
                ))}
              </VStack>
            </Table.Cell>
            <Table.Cell>
              <Badge variant="solid">
                {item.campaignMetric[0].messagesSent}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Badge variant="solid">
                {item.campaignMetric[0].salesTotalQuantity}
              </Badge>
            </Table.Cell>
            <Table.Cell>{formatStatus(item.status)}</Table.Cell>

            <Table.Cell>{formatDate(item.scheduledDate)}</Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
      {selectedCampaign && (
        <EditScheduledDispatchForm
          data={selectedCampaign}
          onClose={() => {
            setSelectedCampaign(null)
          }}
        />
      )}
    </>
  )
}

export { ScheduledDispatchList }
