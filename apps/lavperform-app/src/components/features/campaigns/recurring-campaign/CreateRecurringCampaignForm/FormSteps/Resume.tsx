import { Box, EmptyState, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { PiEmpty } from 'react-icons/pi'

import { DisplaySelectedWeekday } from '@/components'
import { CampaignCouponCard } from '@/components/features/campaigns/coupons/CampaignCouponCard/CampaignCouponCard'
import { MetaTemplatePreview } from '@/components/features/campaigns/meta-templates/MetaTemplatePreview'
import { getTemplateDisplayLabel } from '@/components/features/campaigns/meta-templates/metaTemplate.utils'
import { CHANNEL_CATALOG } from '@/components/features/channels/channelCatalog.constants'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useCompanyCoupons } from '@/hooks/queries'
import { useMetaTemplates } from '@/hooks/queries/useMetaTemplates'
import { formatCurrency } from '@/utils/money'

import { DEFAULT_MAX_DAILY_SENDS, discountTypeItems, incitationItems } from '../../constants'
import { formatSendScheduleLabel } from '../../sendSchedule.utils'
import { isWhatsAppBusinessApiChannel } from '@/utils/campaigns/isWhatsAppBusinessApiChannel'
import {
  getMetaTemplateVariableLabel,
} from '@/utils/campaigns/metaTemplateVariable.constants'
import { FormStepsProps } from './FormSteps.types'
import { CreativeCard } from './CreativeCard'

function hasCouponId(couponId: unknown): boolean {
  return typeof couponId === 'string' && couponId.trim().length > 0
}

export function Resume(props: FormStepsProps) {
  const { theme } = useWhiteLabel()
  const { selectedCompany } = useAuth()
  const { data: couponsResult } = useCompanyCoupons(selectedCompany?.id)
  const companyCoupons = couponsResult?.data
  const hasDelivery = theme.features.hasDelivery
  const incitation = useMemo(
    () => incitationItems.find((item) => item.value === props.formData?.incitation),
    [props.formData?.incitation]
  )

  const activeDaysStrings: string[] = Array.isArray(props.formData?.daysOfWeek)
    ? (props.formData.daysOfWeek as string[])
    : []

  const discountType = useMemo(
    () => discountTypeItems.find((item) => item.value === props.formData?.discountType),
    [props.formData?.discountType]
  )

  const selectedChannelsLabel = useMemo(() => {
    const selected = props.formData?.channels
    if (!Array.isArray(selected) || selected.length < 1) return []

    const nameByKey = new Map(CHANNEL_CATALOG.map((c) => [c.key, c.name] as const))
    return selected.map((key) => nameByKey.get(key) ?? key)
  }, [props.formData?.channels])

  const couponIdStr = props.formData?.couponId ?? null
  const selectedCoupon = useMemo(() => {
    if (!hasCouponId(couponIdStr)) return undefined
    return (companyCoupons ?? []).find((c) => c.id === couponIdStr)
  }, [companyCoupons, couponIdStr])

  const couponOnlyBenefit =
    props.formData?.incitation === 'none' && hasCouponId(couponIdStr)

  const usesOfficialTemplate = isWhatsAppBusinessApiChannel(props.formData?.channels)

  const { data: metaTemplates = [] } = useMetaTemplates(selectedCompany?.id)
  const selectedMetaTemplate = useMemo(
    () =>
      metaTemplates.find(
        (template) => template.id === props.formData?.metaMessageTemplateId,
      ),
    [metaTemplates, props.formData?.metaMessageTemplateId],
  )

  const showIncentiveDetails =
    !!incitation?.title &&
    !(props.formData.incitation === 'tax' && !hasDelivery) &&
    !couponOnlyBenefit

  if (!props.formData) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <PiEmpty />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>Campos não preenchidos</EmptyState.Title>
            <EmptyState.Description>
              Volte nas etapas anteriores e informe os campos necessários para
              gerar a campanha
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <Stack>
      {usesOfficialTemplate ? (
        <>
          <Text fontWeight="bold">Template da campanha:</Text>
          <Text mb={2}>
            {props.formData.selectedMetaTemplateLabel ||
              (selectedMetaTemplate
                ? getTemplateDisplayLabel(selectedMetaTemplate)
                : null) ||
              props.formData.metaMessageTemplateId ||
              'Nenhum template selecionado'}
          </Text>
          {selectedMetaTemplate && (
            <Box mb={4}>
              <MetaTemplatePreview
                components={selectedMetaTemplate.components}
                headerMediaUrl={selectedMetaTemplate.headerMediaUrl}
                name={getTemplateDisplayLabel(selectedMetaTemplate)}
              />
            </Box>
          )}
          {(props.formData.metaTemplateVariableMappings?.length ?? 0) > 0 && (
            <>
              <Text fontWeight="bold">Variáveis:</Text>
              <Stack mb={4}>
                {props.formData.metaTemplateVariableMappings?.map((mapping) => (
                  <Text key={mapping.index}>
                    {`{{${mapping.index}}}`} →{' '}
                    {getMetaTemplateVariableLabel(mapping.source)}
                  </Text>
                ))}
              </Stack>
            </>
          )}
        </>
      ) : (
        <>
          <Text fontWeight="bold">Criativos da campanha:</Text>
          {props.formData.creatives && props.formData.creatives.length > 0 ? (
            <SimpleGrid
              columns={{ base: 1, md: 2, xl: 3 }}
              gap={3}
              mb={4}
            >
              {props.formData.creatives.map((creative) => (
                <CreativeCard
                  creative={creative}
                  isReadOnly
                  key={creative.id}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Text
              color="fg.muted"
              mb={4}
            >
              Nenhum criativo adicionado
            </Text>
          )}
        </>
      )}
      <Text fontWeight="bold">Canal:</Text>
      {selectedChannelsLabel.length > 0 ? (
        <Stack mb={4}>
          {selectedChannelsLabel.map((label) => (
            <Text key={label}>{label}</Text>
          ))}
        </Stack>
      ) : (
        <Text
          color="fg.muted"
          mb={4}
        >
          Nenhum canal selecionado
        </Text>
      )}
      <Text fontWeight="bold">Limite máximo de envios por dia:</Text>
      <Text mb={4}>
        {props.formData.maxDailySends ?? DEFAULT_MAX_DAILY_SENDS}
      </Text>
      <Text fontWeight="bold">Horário de envio:</Text>
      <Text mb={4}>
        {formatSendScheduleLabel(
          props.formData.sendTimeStart,
          props.formData.sendTimeEnd,
        )}
      </Text>
      {hasCouponId(couponIdStr) && (
        <>
          <Text fontWeight="bold">Cupom da campanha:</Text>
          {selectedCoupon ? (
            <Box
              maxW={{ base: 'full', md: 'sm' }}
              mb={4}
            >
              <CampaignCouponCard
                coupon={selectedCoupon}
                mode="static"
              />
            </Box>
          ) : (
            <Text
              color="fg.muted"
              fontSize="sm"
              mb={4}
            >
              Cupom selecionado não encontrado na listagem atual (id:{' '}
              {String(couponIdStr)}).
            </Text>
          )}
        </>
      )}
      {showIncentiveDetails && (
        <>
          <Text fontWeight="bold">Tipo de incentivo:</Text>
          <Text mb={4}>{incitation.title}</Text>
          {props.formData.incitation === 'tax' && (
            <>
              <Text fontWeight="bold">Raio de entrega:</Text>
              <Text mb={4}>{props.formData.deliveryRadius} KM</Text>
            </>
          )}
          {props.formData.incitation === 'discount' && discountType?.title && (
            <>
              <Text fontWeight="bold">Tipo de desconto:</Text>
              <Text mb={4}>{discountType.title}</Text>
              {props.formData.discountType === 'percent' && (
                <>
                  <Text fontWeight="bold">Porcentagem de desconto:</Text>
                  <Text mb={4}>{props.formData.discountPercent}%</Text>
                </>
              )}
              {props.formData.discountType === 'currency' && (
                <>
                  <Text fontWeight="bold">Valor de desconto:</Text>
                  <Text mb={4}>
                    {formatCurrency(props.formData.discountCurrency)}
                  </Text>
                </>
              )}
            </>
          )}
        </>
      )}
      <DisplaySelectedWeekday
        displayItems={activeDaysStrings}
        label="Disponibilidade Semanal de Agendamento:"
      />
    </Stack>
  )
}
