import {
  Badge,
  Box,
  Button,
  Checkbox,
  HStack,
  Popover,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react'
import { LuChevronDown, LuFilter } from 'react-icons/lu'

export interface MultiSelectOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  /** Quando informado, substitui o `colorPalette` do ponto de seleção. */
  color?: string
}

interface MultiSelectFilterProps<T extends string = string> {
  label: string
  icon?: ReactNode
  options: MultiSelectOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  size?: 'xs' | 'sm' | 'md'
  /** Largura mínima do popover. Default 220px. */
  minWidth?: number | string
  placeholder?: string
}

/**
 * Multi-select compacto para barras de filtro. Usa `Popover + Checkbox` ao
 * invés de `Select` do Chakra para ter mais liberdade visual (contadores,
 * ícones por item, "Limpar seleção", etc.).
 */
function MultiSelectFilterComponent<T extends string = string>({
  label,
  icon,
  options,
  value,
  onChange,
  size = 'sm',
  minWidth = 220,
  placeholder = 'Todos',
}: MultiSelectFilterProps<T>) {
  const [open, setOpen] = useState(false)

  const selectedSet = useMemo(() => new Set(value), [value])

  const handleToggle = useCallback(
    (option: T) => {
      const next = new Set(selectedSet)
      if (next.has(option)) next.delete(option)
      else next.add(option)
      onChange(Array.from(next))
    },
    [onChange, selectedSet]
  )

  const handleClear = useCallback(() => {
    onChange([])
  }, [onChange])

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return placeholder
    if (value.length === 1) {
      return options.find((o) => o.value === value[0])?.label ?? value[0]
    }
    return `${value.length} selecionados`
  }, [options, placeholder, value])

  return (
    <Popover.Root
      onOpenChange={(d) => setOpen(d.open)}
      open={open}
      positioning={{ placement: 'bottom-start', gutter: 6 }}
    >
      <Popover.Trigger asChild>
        <Button
          _hover={{ bg: 'bg.subtle', borderColor: 'colorPalette.emphasized' }}
          aria-label={`Filtrar ${label.toLowerCase()}`}
          bg="bg.panel"
          borderColor="border.emphasized"
          borderWidth="1px"
          color="fg"
          flexShrink={0}
          fontWeight="medium"
          gap={2}
          maxW={{ base: 'full', md: 'none' }}
          minW={0}
          overflow="hidden"
          px={3}
          rounded="lg"
          shadow="xs"
          size={size}
          variant="outline"
        >
          <Box
            alignItems="center"
            as="span"
            bg="colorPalette.subtle"
            color="colorPalette.fg"
            display="inline-flex"
            flexShrink={0}
            justifyContent="center"
            p={1}
            rounded="md"
          >
            {icon ?? <LuFilter size={14} />}
          </Box>
          <Text
            as="span"
            lineClamp={1}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            <Text
              as="span"
              color="fg.muted"
              mr={1}
            >
              {label}
            </Text>
            {triggerLabel}
          </Text>
          {value.length > 0 && (
            <Badge
              colorPalette="colorPalette"
              size="xs"
              variant="solid"
            >
              {value.length}
            </Badge>
          )}
          <Box
            as="span"
            color="fg.muted"
            flexShrink={0}
            transform={open ? 'rotate(180deg)' : 'rotate(0deg)'}
            transition="transform 160ms ease"
          >
            <LuChevronDown size={14} />
          </Box>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            bg="bg.panel"
            borderColor="border.muted"
            maxH="320px"
            minW={minWidth}
            overflowY="auto"
            rounded="lg"
            shadow="lg"
          >
            <Stack
              gap={1}
              p={2}
            >
              <HStack
                justify="space-between"
                px={2}
                py={1}
              >
                <Text
                  color="fg.muted"
                  fontSize="2xs"
                  fontWeight="semibold"
                  letterSpacing="widest"
                  textTransform="uppercase"
                >
                  {label}
                </Text>
                {value.length > 0 && (
                  <Button
                    fontSize="xs"
                    h="auto"
                    onClick={handleClear}
                    p={0}
                    variant="plain"
                  >
                    Limpar
                  </Button>
                )}
              </HStack>
              {options.map((option) => {
                const checked = selectedSet.has(option.value)
                return (
                  <Checkbox.Root
                    _hover={{ bg: 'bg.emphasized' }}
                    checked={checked}
                    cursor="pointer"
                    key={option.value}
                    onCheckedChange={() => handleToggle(option.value)}
                    px={2}
                    py={1.5}
                    rounded="md"
                    w="full"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label
                      alignItems="center"
                      display="flex"
                      flex={1}
                      gap={2}
                      minW={0}
                    >
                      {option.icon}
                      <Text
                        as="span"
                        fontSize="sm"
                        lineClamp={1}
                      >
                        {option.label}
                      </Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                )
              })}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

const MultiSelectFilter = memo(
  MultiSelectFilterComponent
) as typeof MultiSelectFilterComponent

export { MultiSelectFilter }
