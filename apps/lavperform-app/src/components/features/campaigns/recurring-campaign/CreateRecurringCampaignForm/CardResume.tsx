import { Badge, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { useAuth } from '@/context/AuthContext'
import { useCustomerSummary } from '@/context/CustomerSummaryContext'
import { useAudiences } from '@/hooks/queries/useAudiences'
import { useCustomSendLists } from '@/hooks/queries/useCustomSendLists'
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
  const { data: customSendListsData } = useCustomSendLists(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })

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
        (list) => list.id === props.formData!.customSendListId,
      ) ?? null
    )
  }, [customSendListsData?.data, isCustomListMode, props.formData?.customSendListId])

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
  }, [customersSummary, isAudienceMode, isCustomListMode, props.formData, selectedAudience, selectedCustomSendList])

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
            <Text>Alcance</Text>
            <Text
              fontSize="2xl"
              fontWeight={700}
            >
              {totalCustomers.toLocaleString('pt-BR')}
            </Text>
          </Badge>
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
