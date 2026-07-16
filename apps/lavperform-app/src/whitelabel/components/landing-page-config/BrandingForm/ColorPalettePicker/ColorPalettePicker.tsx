import {
  Card,
  Field,
  HStack,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useState, useRef, useEffect } from 'react'
import { Controller, Control, FieldValues } from 'react-hook-form'

import { Props } from './ColorPalettePicker.types'

interface ColorFieldProps<T extends FieldValues = FieldValues> {
  label: string
  name: string
  control: Control<T>
}

function ColorFieldBase<T extends FieldValues = FieldValues>({ label, name, control }: ColorFieldProps<T>) {
  const [localTextValue, setLocalTextValue] = useState<string>('')
  const isTypingRef = useRef(false)
  const previousValueRef = useRef<string>('')

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const currentValue = field.value || '#000000'

        // Sincroniza quando o valor muda externamente (pelo seletor de cor)
        useEffect(() => {
          if (!isTypingRef.current && previousValueRef.current !== currentValue) {
            setLocalTextValue('')
            previousValueRef.current = currentValue
          }
        }, [currentValue])

        const handleColorChange = (newColor: string) => {
          if (!isTypingRef.current) {
            setLocalTextValue('')
          }
          field.onChange(newColor)
        }

        const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value
          setLocalTextValue(newValue)
          isTypingRef.current = true
          
          if (newValue === '') {
            return
          }
          
          // Permite digitação livre de hex (com ou sem #)
          const cleanValue = newValue.replace(/^#+/, '') // Remove múltiplos #
          if (/^[A-Fa-f0-9]{0,6}$/.test(cleanValue)) {
            const valueWithHash = `#${cleanValue}`
            
            // Atualiza apenas se for válido completo
            if (valueWithHash.length === 7 && /^#[A-Fa-f0-9]{6}$/.test(valueWithHash)) {
              field.onChange(valueWithHash)
            } else if (valueWithHash.length === 4 && /^#[A-Fa-f0-9]{3}$/.test(valueWithHash)) {
              field.onChange(valueWithHash)
            }
          }
        }

        const handleTextBlur = () => {
          isTypingRef.current = false
          const finalValue = localTextValue.trim()
          
          if (finalValue === '') {
            setLocalTextValue('')
            return
          }
          
          // Remove múltiplos # e adiciona apenas um
          const cleanValue = finalValue.replace(/^#+/, '')
          const valueWithHash = `#${cleanValue}`
          
          // Valida formato hex
          if (/^#[A-Fa-f0-9]{6}$/.test(valueWithHash) || /^#[A-Fa-f0-9]{3}$/.test(valueWithHash)) {
            field.onChange(valueWithHash)
            setLocalTextValue('')
          } else {
            // Se inválido, volta para o valor atual
            setLocalTextValue('')
          }
        }

        const displayValue = isTypingRef.current ? localTextValue : currentValue

        return (
          <Field.Root invalid={!!error}>
            <Field.Label>{label}</Field.Label>
            <HStack gap={2} w="full">
              <Input
                type="color"
                value={currentValue}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  // onInput é mais suave durante o arraste (não bloqueia a UI)
                  const target = e.target as HTMLInputElement
                  handleColorChange(target.value)
                }}
                onChange={(e) => {
                  // onChange garante atualização quando soltar
                  handleColorChange(e.target.value)
                }}
                w="60px"
                h="48px"
                p={0}
                border="none"
                cursor="pointer"
                flexShrink={0}
                sx={{
                  '&::-webkit-color-swatch-wrapper': {
                    padding: 0,
                  },
                  '&::-webkit-color-swatch': {
                    border: '2px solid',
                    borderColor: 'border.emphasized',
                    borderRadius: 'md',
                  },
                }}
              />
              <Input
                type="text"
                value={displayValue}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                onFocus={() => {
                  isTypingRef.current = true
                }}
                placeholder="#000000"
                flex={1}
                maxLength={7}
                fontFamily="mono"
                fontSize="sm"
              />
            </HStack>
            {!!error && <Field.ErrorText>{error.message}</Field.ErrorText>}
          </Field.Root>
        )
      }}
    />
  )
}

const ColorField = memo(ColorFieldBase) as typeof ColorFieldBase

function ColorPalettePickerBase<T extends FieldValues = FieldValues>({
  control,
  primaryColorName,
  secondaryColorName,
  tertiaryColorName,
}: Props<T>) {
  return (
    <Card.Root variant="elevated">
      <Card.Header>
        <Card.Title>Paleta de Cores</Card.Title>
        <Card.Description>
          Defina as cores principais que serão usadas na sua Landing Page
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={6}>
          <Stack gap={4}>
            <ColorField
              label="Cor Primária"
              name={primaryColorName}
              control={control}
            />
            <ColorField
              label="Cor Secundária"
              name={secondaryColorName}
              control={control}
            />
            <ColorField
              label="Cor Terciária"
              name={tertiaryColorName}
              control={control}
            />
          </Stack>
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            Você pode selecionar a cor visualmente ou digitar o código hexadecimal (ex: #FF5733)
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const ColorPalettePicker = memo(ColorPalettePickerBase) as typeof ColorPalettePickerBase

export { ColorPalettePicker, type Props as ColorPalettePickerProps }
