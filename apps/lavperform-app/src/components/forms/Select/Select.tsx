import { Field, Select as ChakraSelect } from '@chakra-ui/react'
import { memo } from 'react'
import { Controller, useController } from 'react-hook-form'

import { Props } from './Select.types'

const SelectComponent = <T,>({
  name,
  control,
  label,
  required,
  disabled,
  placeholder,
  collection,
  multiple = false,
  ...rest
}: Props<T>) => {
  const { fieldState } = useController({
    name,
    control,
  })

  const { error } = fieldState

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
          <ChakraSelect.Root
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
            <ChakraSelect.HiddenSelect />
            <ChakraSelect.Control>
              <ChakraSelect.Trigger>
                <ChakraSelect.ValueText placeholder={placeholder} />
              </ChakraSelect.Trigger>
              <ChakraSelect.IndicatorGroup>
                <ChakraSelect.Indicator />
              </ChakraSelect.IndicatorGroup>
            </ChakraSelect.Control>
            <ChakraSelect.Positioner>
              <ChakraSelect.Content>
                {collection.items.map((item: T) => (
                  <ChakraSelect.Item
                    item={item}
                    key={(item as any).value}
                  >
                    {(item as any).label}
                    <ChakraSelect.ItemIndicator />
                  </ChakraSelect.Item>
                ))}
              </ChakraSelect.Content>
            </ChakraSelect.Positioner>
          </ChakraSelect.Root>
        )}
      />
      <Field.ErrorText>{error?.message}</Field.ErrorText>
    </Field.Root>
  )
}

const Select = memo(SelectComponent) as typeof SelectComponent

export { Select, type Props as SelectProps }
