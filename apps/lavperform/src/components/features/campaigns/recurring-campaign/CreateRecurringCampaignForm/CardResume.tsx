import { Badge, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { useCustomerSummary } from '@/context/CustomerSummaryContext'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { convertISOToDate } from '@/utils/convertISOToDate'

import { campaignTypeItems } from '../constants'
import { FormStepsProps } from './FormSteps/FormSteps.types'

export function CardResume(props: FormStepsProps) {
  const { customersSummary } = useCustomerSummary()

  const campaign = useMemo(
    () =>
      props.formData
        ? campaignTypeItems.find(
            (item) => item.value === props.formData.campaignType
          )
        : undefined,
    [props.formData]
  )

  const totalCustomers = useMemo(() => {
    if (
      !props.formData?.segmentation ||
      !Array.isArray(props.formData.segmentation)
    ) {
      return 0
    }
    return customersSummary
      .filter((customer) =>
        props.formData.segmentation.includes(customer.segmentation)
      )
      .reduce((total, customer) => total + (customer.count || 0), 0)
  }, [customersSummary, props.formData])

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
          {props.formData.name && (
            <Text lineClamp={1}>{props.formData.name}</Text>
          )}
          {props.formData.segmentation && (
            <>
              <Text fontWeight={500}>Público selecionado:</Text>
              <HStack wrap="wrap">
                {Array.isArray(props.formData.segmentation) &&
                  props.formData.segmentation.map((segmentationItem) => (
                    <Badge key={segmentationItem}>
                      {clientTypesOptions.items.find(
                        (item) => item.value === segmentationItem
                      )?.label ?? segmentationItem}
                    </Badge>
                  ))}
              </HStack>
            </>
          )}
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
              {totalCustomers}
            </Text>
          </Badge>
          {props.formData.startDate && (
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
