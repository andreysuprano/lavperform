import { Button, Field, Group, Input } from '@chakra-ui/react'
import { memo, useState } from 'react'
import { FieldValues, useController } from 'react-hook-form'
import { BsEye, BsEyeSlash } from 'react-icons/bs'

import { Props } from './PasswordInput.types'

export function PasswordInputComponent<T extends FieldValues>({
  name,
  control,
  label,
  required,
  disabled,
  ...rest
}: Props<T>) {
  const { field, fieldState } = useController({
    name,
    control,
  })
  const { error } = fieldState

  const [visible, setVisible] = useState(true)

  function toggleVisible() {
    setVisible((prev) => !prev)
  }

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
      <Group
        attached
        w="full"
      >
        <Input
          {...field}
          id={field.name}
          required={false}
          {...rest}
          type={visible ? 'password' : 'text'}
        />
        <Button onClick={toggleVisible}>
          {visible ? <BsEye /> : <BsEyeSlash />}
        </Button>
      </Group>
      {!!error && <Field.ErrorText>{error?.message}</Field.ErrorText>}
    </Field.Root>
  )
}

const PasswordInput = memo(
  PasswordInputComponent
) as typeof PasswordInputComponent

export { PasswordInput, type Props as PasswordInputProps }
