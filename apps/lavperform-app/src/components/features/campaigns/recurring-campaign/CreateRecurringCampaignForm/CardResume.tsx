import { Badge, Card, HStack, Skeleton, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { CHANNEL_CATALOG } from '@/components/features/channels/channelCatalog.constants'
import { useAuth } from '@/context/AuthContext'
import { useCustomerSummary } from '@/context/CustomerSummaryContext'
import { useAudiences } from '@/hooks/queries/useAudiences'
import { useCampaignReachPreview } from '@/hooks/queries/useCampaigns'
import { useCustomSendLists } from '@/hooks/queries/useCustomSendLists'
import {
  hasReachPreviewChannel,
  toReachPreviewRequest,
} from '@/utils/campaigns/reachPreviewRequest'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { convertISOToDate } from '@/utils/convertISOToDate'

import { campaignTypeItems } from '../constants'
import { FormStepsProps } from './FormSteps/FormSteps.types'

export function CardResume(props: FormStepsProps) {
  const { customersSummary } = useCustomerSummary()
  const { selectedCompany } = useAuth()
  const { data: audiencesData } = useAudiences(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })
  const { data: customSendListsData } = useCustomSendLists(
    selectedCompany?.id,
    {
      page: 1,
      limit: 100,
    }
  )

  const campaign = useMemo(
    () =>
      props.formData
        ? campaignTypeItems.find(
            (item) => item.value === props.formData!.campaignType
          )
        : undefined,
    [props.formData]
  )

  const isAudienceMode = props.formData?.targetingMode === 'AUDIENCE'
  const isCustomListMode = props.formData?.targetingMode === 'CUSTOMER_LIST'

  const selectedAudience = useMemo(() => {
    if (!isAudienceMode || !props.formData?.audienceId) return null
    return (
      audiencesData?.data?.find(
        (audience) => audience.id === props.formData!.audienceId
      ) ?? null
    )
  }, [audiencesData?.data, isAudienceMode, props.formData?.audienceId])

  const selectedCustomSendList = useMemo(() => {
    if (!isCustomListMode || !props.formData?.customSendListId) return null
    return (
      customSendListsData?.data?.find(
        (list) => list.id === props.formData!.customSendListId
      ) ?? null
    )
  }, [
    customSendListsData?.data,
    isCustomListMode,
    props.formData?.customSendListId,
  ])

  const totalCustomers = useMemo(() => {
    if (isAudienceMode) {
      return selectedAudience?.customerCount ?? 0
    }

    if (isCustomListMode) {
      return selectedCustomSendList?.memberCount ?? 0
    }

    if (
      !props.formData?.segmentation ||
      !Array.isArray(props.formData.segmentation)
    ) {
      return 0
    }

    return customersSummary
      .filter((customer) =>
        props.formData!.segmentation.includes(customer.segmentation)
      )
      .reduce((total, customer) => total + (customer.count || 0), 0)
  }, [
    customersSummary,
    isAudienceMode,
    isCustomListMode,
    props.formData,
    selectedAudience,
    selectedCustomSendList,
  ])

  const selectedChannelKey = props.formData?.channels?.[0]
  const hasChannel = hasReachPreviewChannel(props.formData?.channels)
  const reachPreviewRequest = useMemo(
    () => toReachPreviewRequest(props.formData ?? {}),
    [props.formData]
  )
  const {
    data: reachPreview,
    isError: isReachPreviewError,
    isPending: isReachPreviewPending,
    isSuccess: isReachPreviewSuccess,
  } = useCampaignReachPreview(selectedCompany?.id, reachPreviewRequest)

  const channelCatalogName = selectedChannelKey
    ? CHANNEL_CATALOG.find((item) => item.key === selectedChannelKey)?.name
    : undefined
  const reachLabel =
    hasChannel && channelCatalogName
      ? `Alcance no ${channelCatalogName}`
      : 'Alcance'

  const hasRfvSegmentation =
    !isAudienceMode &&
    !isCustomListMode &&
    props.formData?.segmentation &&
    Array.isArray(props.formData.segmentation) &&
    props.formData.segmentation.length > 0

  if (props.id === 0 || props.id === 1) return null

  return (
    <Card.Root
      mb={0}
      variant="subtle"
    >
      <Card.Body
        alignItems="center"
        flexDirection="row"
        gap={4}
      >
        <VStack
          align={'flex-start'}
          flex={1}
        >
          {campaign && (
            <Text
              fontSize="md"
              fontWeight={700}
            >
              {campaign.title}
            </Text>
          )}
          {props.formData?.name && (
            <Text lineClamp={1}>{props.formData.name}</Text>
          )}
          {isAudienceMode && selectedAudience ? (
            <>
              <Text fontWeight={500}>Público selecionado:</Text>
              <HStack wrap="wrap">
                <Badge>{selectedAudience.name}</Badge>
              </HStack>
            </>
          ) : null}
          {isCustomListMode && selectedCustomSendList ? (
            <>
              <Text fontWeight={500}>Público selecionado:</Text>
              <HStack wrap="wrap">
                <Badge>{selectedCustomSendList.name}</Badge>
              </HStack>
            </>
          ) : null}
          {hasRfvSegmentation ? (
            <>
              <Text fontWeight={500}>Público selecionado:</Text>
              <HStack wrap="wrap">
                {props.formData!.segmentation.map((segmentationItem) => (
                  <Badge key={segmentationItem}>
                    {clientTypesOptions.items.find(
                      (item) => item.value === segmentationItem
                    )?.label ?? segmentationItem}
                  </Badge>
                ))}
              </HStack>
            </>
          ) : null}
        </VStack>
        <VStack alignItems="flex-end">
          <Badge
            flexDirection="column"
            gap={2}
            justifyContent="center"
            p={4}
            variant="surface"
          >
            <Text>{reachLabel}</Text>
            {hasChannel ? (
              !reachPreviewRequest || isReachPreviewError ? (
                <Text
                  fontSize="2xl"
                  fontWeight={700}
                >
                  -
                </Text>
              ) : isReachPreviewPending || !isReachPreviewSuccess ? (
                <Skeleton
                  h="2rem"
                  rounded="md"
                  w="4.5rem"
                />
              ) : (
                <Text
                  fontSize="2xl"
                  fontWeight={700}
                >
                  {reachPreview.count.toLocaleString('pt-BR')}
                </Text>
              )
            ) : (
              <Text
                fontSize="2xl"
                fontWeight={700}
              >
                {totalCustomers.toLocaleString('pt-BR')}
              </Text>
            )}
          </Badge>
          {hasChannel && isReachPreviewSuccess && reachPreview?.count === 0 ? (
            <Text
              fontSize="xs"
              maxW="16rem"
              textAlign="right"
            >
              Nenhum cliente pode receber neste canal.
            </Text>
          ) : null}
          {hasChannel && isReachPreviewError ? (
            <Text
              fontSize="xs"
              maxW="16rem"
              textAlign="right"
            >
              Não foi possível calcular o alcance.
            </Text>
          ) : null}
          {props.formData?.startDate && (
            <Text fontSize="xs">
              {convertISOToDate(props.formData.startDate, {
                timeZone: 'UTC',
              })}
              {' - '}
              {props.formData.endDate?.trim()
                ? convertISOToDate(props.formData.endDate, {
                    timeZone: 'UTC',
                  })
                : 'Sem data fim'}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
