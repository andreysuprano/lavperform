import {
  Alert,
  Badge,
  Field,
  HStack,
  Link,
  RadioCard,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import { useWhiteLabel } from '@/config'
import { clientTypesOptions } from '@/utils/constants/clientType'

import {
  campaignTypeItems,
  creatableCampaignTypeItems,
} from '../../constants'
import { getWizardFormId } from '../../wizardFormId'
import { FormStepsProps } from './FormSteps.types'

const schema = yup.object({
  campaignType: yup.string().required('Informe o tipo da campanha'),
})

type FormData = yup.InferType<typeof schema>

export function SelectType(props: FormStepsProps) {
  const { colors } = useWhiteLabel()
  const isEdit = props.wizardContext === 'edit'
  const currentCampaignTypeItem = useMemo(
    () =>
      campaignTypeItems.find(
        (item) => item.value === props.formData?.campaignType
      ),
    [props.formData?.campaignType]
  )

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    values: {
      campaignType: props.formData?.campaignType ?? '',
    },
  })

  const suggestedTarget = useMemo(() => {
    const item = campaignTypeItems.find(
      (i) => i.value === props.formData?.campaignType
    )
    return item?.target ?? []
  }, [props.formData?.campaignType])

  const [target, setTarget] = useState<string[]>(() => suggestedTarget)

  useEffect(() => {
    if (props.formData?.segmentation?.length) {
      setTarget(props.formData.segmentation)
    } else {
      setTarget(suggestedTarget)
    }
  }, [props.formData?.campaignType, props.formData?.segmentation, suggestedTarget])

  const onSubmit = (values: FormData) => {
    props.onSubmit?.({
      ...values,
      target,
    })
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={getWizardFormId(props.wizardFormId ?? 'campaign', props.id ?? 0)}
      onSubmit={handleSubmit(onSubmit)}
    >
      {!isEdit && (
        <Alert.Root
          status="warning"
          variant="surface"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              Para entender melhor como funcionam as campanhas{' '}
              <Link
                href="#"
                variant="underline"
              >
                clique aqui
              </Link>
              .
            </Alert.Title>
          </Alert.Content>
        </Alert.Root>
      )}
      {isEdit && (
        <Alert.Root
          status="info"
          variant="surface"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              Tipo atual:{' '}
              {currentCampaignTypeItem?.title ??
                props.formData?.campaignType ??
                'não informado'}
              . Você pode mantê-lo ou escolher um dos novos tipos abaixo.
            </Alert.Title>
          </Alert.Content>
        </Alert.Root>
      )}
      <Controller
        control={control}
        name="campaignType"
        render={({ field }) => (
          <Field.Root
            cursor="pointer"
            invalid={!!errors.campaignType}
          >
            <RadioCard.Root
              name={field.name}
              onValueChange={({ value }) => {
                field.onChange(value)
                const item = campaignTypeItems.find((i) => i.value === value)
                setTarget(item?.target ?? [])
              }}
              value={field.value}
            >
              <RadioCard.Label>
                {isEdit
                  ? 'Alterar tipo para:'
                  : 'Selecione o tipo de campanha que deseja criar:'}
              </RadioCard.Label>
              <VStack align="stretch">
                {creatableCampaignTypeItems.map((item) => (
                  <RadioCard.Item
                    _hover={{
                      bg: 'bg.muted',
                      cursor: 'pointer',
                      borderColor: colors.primary,
                    }}
                    disabled={!item.isActive}
                    key={item.value}
                    onClick={() => setTarget(item.target ?? [])}
                    value={item.value}
                  >
                    <RadioCard.ItemHiddenInput />
                    <RadioCard.ItemControl>
                      <RadioCard.ItemContent>
                        <RadioCard.ItemText>
                          {item.title}
                          {!item.isActive && (
                            <Badge
                              ml={2}
                              variant="solid"
                            >
                              Em breve
                            </Badge>
                          )}
                        </RadioCard.ItemText>
                        <RadioCard.ItemDescription>
                          {item.description}
                        </RadioCard.ItemDescription>
                        <RadioCard.ItemText>
                          {item?.target && (
                            <Text
                              mb={1}
                              mt={3}
                            >
                              Público sugerido:
                            </Text>
                          )}
                          <HStack>
                            {item?.target &&
                              item.target.map((t) => (
                                <Badge key={t}>
                                  {
                                    clientTypesOptions.items.find(
                                      (opt) => opt.value === t
                                    )?.label
                                  }
                                </Badge>
                              ))}
                          </HStack>
                        </RadioCard.ItemText>
                      </RadioCard.ItemContent>
                      <RadioCard.ItemIndicator />
                    </RadioCard.ItemControl>
                  </RadioCard.Item>
                ))}
              </VStack>
            </RadioCard.Root>
            {!!errors?.campaignType && (
              <Field.ErrorText>{errors?.campaignType.message}</Field.ErrorText>
            )}
          </Field.Root>
        )}
      />
    </Stack>
  )
}
