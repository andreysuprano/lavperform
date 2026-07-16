import {
  Badge,
  Field,
  HStack,
  RadioCard,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import { useWhiteLabel } from '@/config'
import { clientTypesOptions } from '@/utils/constants/clientType'

import { campaignTypeItems } from '../../constants'
import { FormStepsProps } from './FormSteps.types'

const schema = yup.object({
  campaignType: yup.string().required('Informe o tipo da campanha'),
})

type FormData = yup.InferType<typeof schema>

export function SelectType(props: FormStepsProps) {
  const { colorPalette } = useWhiteLabel()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      campaignType: '',
    },
    values: {
      campaignType: props.formData ? props.formData.campaignType : '',
    },
  })

  const [target, setTarget] = useState<string[]>([])

  const onSubmit = (values: any) => {
    values = {
      ...values,
      target,
    }

    props.onSubmit?.(values)
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
        name="campaignType"
        render={({ field }) => (
          <Field.Root
            cursor="pointer"
            invalid={!!errors.campaignType}
          >
            <RadioCard.Root
              disabled
              name={field.name}
              onValueChange={({ value }) => field.onChange(value)}
              value={field.value}
            >
              <RadioCard.Label>Tipo de campanha Selecionada:</RadioCard.Label>
              <VStack align="stretch">
                {campaignTypeItems.map((item) => (
                  <RadioCard.Item
                    _hover={{
                      bg: 'bg',
                      cursor: 'pointer',
                      borderColor: `${colorPalette}.500`,
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
                              item.target.map((target) => (
                                <Badge key={target}>
                                  {clientTypesOptions.items.find(
                                    (item) => item.value === target
                                  )?.label ?? target}
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
