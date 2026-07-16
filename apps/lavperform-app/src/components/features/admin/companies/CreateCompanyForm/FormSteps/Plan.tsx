import { Badge, Field, HStack, RadioCard, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Empty, LoadingState } from '@/components'
import { useWhiteLabel } from '@/config'
import { useAllPlans } from '@/hooks/queries/useCompany'
import { cycleDescriptions, cycleLabels } from '@/utils/constants/planCycle'
import { formatCurrency } from '@/utils/money'

import { type FormDataPlan, schemaPlan } from '../schema'
import { FormStepsProps } from './FormSteps.types'

function PlanComponent(props: FormStepsProps) {
  const { colors } = useWhiteLabel()

  const { data: plans, isLoading, isError } = useAllPlans()

  const planItems = useMemo(() => {
    if (!plans) return []

    return plans.map((plan) => ({
      id: plan.id,
      value: plan.id,
      title: plan.name || cycleLabels[plan.cycle],
      description: plan.description || cycleDescriptions[plan.cycle],
      price: parseFloat(plan.price),
      maxPayments: plan.maxPayments,
      icon: (
        <Badge
          fontSize="xs"
          rounded="full"
          size="sm"
          variant="solid"
        >
          {plan.maxPayments}
        </Badge>
      ),
    }))
  }, [plans])
  const {
    setValue,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormDataPlan>({
    mode: 'onChange',
    resolver: yupResolver<FormDataPlan, any, any>(schemaPlan),
    defaultValues: {
      planId: '',
    },
    values: {
      planId: props.formData?.planId || '',
    },
  })

  const onSubmit = async (data: any) => {
    props.onSubmit?.(data)
  }

  const handlePlanChange = useCallback(
    (value: string | null) => {
      if (!value) return

      setValue('planId', value)
    },
    [setValue]
  )

  if (isLoading) {
    return <LoadingState />
  }

  if (isError || !plans || plans.length === 0) {
    return (
      <Empty
        description="Não foi possível carregar os planos. Tente novamente mais tarde."
        title="Nenhum plano encontrado"
      />
    )
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Controller
        control={control}
        name="planId"
        render={({ field }) => (
          <Field.Root
            cursor="pointer"
            invalid={!!errors.planId}
          >
            <RadioCard.Root
              name={field.name}
              onValueChange={({ value }) => handlePlanChange(value)}
              value={field.value}
              w="full"
            >
              <RadioCard.Label>Selecione um Plano:</RadioCard.Label>
              <HStack
                align="stretch"
                flexWrap="wrap"
              >
                {planItems
                  .sort((a, b) => a.maxPayments - b.maxPayments)
                  .map((item) => (
                    <RadioCard.Item
                      _hover={{
                        bg: 'bg',
                        cursor: 'pointer',
                        borderColor: colors.primary,
                      }}
                      key={item.value}
                      minW="full"
                      value={item.value}
                    >
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        {item.icon}
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>{item.title}</RadioCard.ItemText>
                          <RadioCard.ItemDescription>
                            {item.description}
                          </RadioCard.ItemDescription>
                          <RadioCard.ItemText>
                            {formatCurrency(item.price)} ao mês
                          </RadioCard.ItemText>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                  ))}
              </HStack>
            </RadioCard.Root>
            {!!errors?.planId && (
              <Field.ErrorText>{errors?.planId.message}</Field.ErrorText>
            )}
          </Field.Root>
        )}
        rules={{ required: true }}
      />
    </Stack>
  )
}

const Plan = memo(PlanComponent)

export { Plan }
