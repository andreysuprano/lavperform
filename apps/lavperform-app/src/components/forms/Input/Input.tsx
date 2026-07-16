import { Field, Input as ChakraInput } from '@chakra-ui/react'
import { memo } from 'react'
import { FieldValues, useController } from 'react-hook-form'

import { Props } from './Input.types'

function InputComponent<T extends FieldValues>({
  name,
  control,
  label,
  type = 'text',
  required,
  disabled,
  ...rest
}: Props<T>) {
  const { field, fieldState } = useController({
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
      {label && (
        <Field.Label htmlFor={field.name}>
          {label}
          <Field.RequiredIndicator />
        </Field.Label>
      )}
      <ChakraInput
        {...field}
        id={field.name}
        required={false}
        type={type}
        {...rest}
      />
      {!!error && <Field.ErrorText>{error?.message}</Field.ErrorText>}
    </Field.Root>
  )
}

const Input = memo(InputComponent) as typeof InputComponent

export { Input, type Props as InputProps }
