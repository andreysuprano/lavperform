import { Field, Textarea as ChakraTextarea } from '@chakra-ui/react'
import { memo } from 'react'
import { useController } from 'react-hook-form'

import { Props } from './Textarea.types'

export const TextareaComponent = ({
  name,
  control,
  label,
  required,
  disabled,
  ...rest
}: Props) => {
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
      <Field.Label htmlFor={field.name}>
        {label}
        <Field.RequiredIndicator />
      </Field.Label>
      <ChakraTextarea
        {...field}
        id={field.name}
        required={false}
        {...rest}
      />
      {!!error && <Field.ErrorText>{error?.message}</Field.ErrorText>}
    </Field.Root>
  )
}

const Textarea = memo(TextareaComponent) as typeof TextareaComponent

export { Textarea, type Props as TextareaProps }
