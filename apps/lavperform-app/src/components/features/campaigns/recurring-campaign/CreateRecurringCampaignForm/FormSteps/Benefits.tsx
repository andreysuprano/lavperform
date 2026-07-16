import { SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

import { Empty, LoadingState } from '@/components'
import { CampaignCouponCard } from '@/components/features/campaigns/coupons/CampaignCouponCard/CampaignCouponCard'
import { useAuth } from '@/context/AuthContext'
import { useCompanyCoupons } from '@/hooks/queries'
import { isCompanyCouponSelectableForCampaign } from '@/utils/couponEligibility'

import { FormStepsProps } from './FormSteps.types'

const couponSchema = yup.object({
  couponId: yup.string().optional().nullable(),
})

type FormData = yup.InferType<typeof couponSchema>

export function Benefits(props: FormStepsProps) {
  const { selectedCompany } = useAuth()
  const { data: couponsResult, isLoading: isLoadingCoupons } =
    useCompanyCoupons(selectedCompany?.id)
  const companyCoupons = couponsResult?.data

  const availableCoupons = useMemo(
    () =>
      (companyCoupons ?? []).filter((c) =>
        isCompanyCouponSelectableForCampaign(c)
      ),
    [companyCoupons]
  )

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: yupResolver(couponSchema),
    defaultValues: { couponId: null },
    values: { couponId: props.formData?.couponId ?? null },
  })

  const couponIdValue = watch('couponId')

  useEffect(() => {
    const cid = props.formData?.couponId
    if (!cid || isLoadingCoupons) return
    const stillAvailable = availableCoupons.some((c) => c.id === cid)
    if (!stillAvailable) {
      setValue('couponId', null)
    }
  }, [availableCoupons, isLoadingCoupons, props.formData?.couponId, setValue])

  const onSubmit = (data: FormData) => {
    props.onSubmit?.({
      couponId: data.couponId ?? null,
      incitation: 'none' as const,
      deliveryRadius: 0,
      discountPercent: 0,
      discountCurrency: 0,
      discountType: undefined,
    })
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Stack gap={1}>
        <Text fontWeight="semibold">Cupom</Text>
        <Text color="fg.muted" fontSize="sm">
          Selecione um cupom para associar à campanha. O cupom será enviado junto com a comunicação.
        </Text>
      </Stack>

      {isLoadingCoupons ? (
        <LoadingState title="Carregando cupons..." />
      ) : availableCoupons.length === 0 ? (
        <Empty
          description="Cadastre cupons ativos na página de cupons em Fidelização."
          title="Nenhum cupom disponível"
        />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          {availableCoupons.map((coupon) => (
            <CampaignCouponCard
              coupon={coupon}
              isSelected={couponIdValue === coupon.id}
              key={coupon.id}
              onClearSelection={() => setValue('couponId', null)}
              onSelect={() => {
                const togglingOff = couponIdValue === coupon.id
                setValue('couponId', togglingOff ? null : coupon.id)
              }}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
