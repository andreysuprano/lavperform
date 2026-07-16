import { Field, Select } from '@chakra-ui/react'
import { memo } from 'react'
import { Controller, useController } from 'react-hook-form'

import { useCustomerSummary } from '@/context/CustomerSummaryContext'

import { Props } from './SegmentationSelect.types'

export const SegmentationSelectComponent = ({
  name,
  control,
  label,
  required,
  disabled,
  placeholder,
  collection,
  multiple = false,
  ...rest
}: Props) => {
  const { fieldState } = useController({
    name,
    control,
  })
  const { error } = fieldState

  const { customersSummary } = useCustomerSummary()

  return (
    <Field.Root
      disabled={disabled}
      invalid={!!error}
      required={required}
    >
      <Field.Label>
        {label}
        <Field.RequiredIndicator />
      </Field.Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select.Root
            multiple={multiple}
            name={field.name}
            onInteractOutside={() => field.onBlur()}
            onValueChange={({ value }) => {
              const newValue = multiple ? value : value[0]
              field.onChange(newValue)
            }}
            required={false}
            value={multiple ? field.value : field.value ? [field.value] : []}
            {...rest}
            collection={collection}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder={placeholder} />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {collection.items.map((item) => (
                  <Select.Item
                    item={item}
                    key={item.value}
                  >
                    {item.label} (
                    {customersSummary?.find(
                      (i) => i.segmentation === item.value
                    )?.count ?? 0}
                    )
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        )}
      />
      <Field.ErrorText>{error?.message}</Field.ErrorText>
    </Field.Root>
  )
}

const SegmentationSelect = memo(
  SegmentationSelectComponent
) as typeof SegmentationSelectComponent

export { SegmentationSelect, type Props as SegmentationSelectProps }
