import {
  Box,
  createListCollection,
  Field,
  Icon,
  Input,
  InputGroup,
  Select,
  Text,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { Controller, useController } from 'react-hook-form'
import { RiSearchLine } from 'react-icons/ri'
import { Link as RouterLink } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { useCustomSendLists } from '@/hooks/queries/useCustomSendLists'
import type { CustomSendList } from '@/types'

type Props = {
  name: string
  control: any
  label?: string
  required?: boolean
}

function normalizeSearch(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function CustomSendListSelect({
  name,
  control,
  label = 'Lista personalizada',
  required = false,
}: Props) {
  const { selectedCompany } = useAuth()
  const { data, isLoading } = useCustomSendLists(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })
  const { fieldState, formState } = useController({ name, control })
  const { error } = fieldState
  const showError = !!error && (fieldState.isTouched || formState.isSubmitted)

  const [searchQuery, setSearchQuery] = useState('')

  const lists = useMemo<CustomSendList[]>(() => data?.data ?? [], [data])

  const filteredLists = useMemo(() => {
    const q = normalizeSearch(searchQuery)
    if (!q) return lists
    return lists.filter((list) => normalizeSearch(list.name).includes(q))
  }, [lists, searchQuery])

  const collection = useMemo(
    () =>
      createListCollection({
        items: filteredLists,
        itemToValue: (item) => item.id,
        itemToString: (item) => item.name,
      }),
    [filteredLists],
  )

  return (
    <Field.Root invalid={showError}>
      <Field.Label>
        {label}
        {required ? <Field.RequiredIndicator /> : null}
      </Field.Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select.Root
            collection={collection}
            disabled={isLoading}
            name={field.name}
            onInteractOutside={() => field.onBlur()}
            onOpenChange={({ open }) => {
              if (!open) setSearchQuery('')
            }}
            onValueChange={({ value }) => field.onChange(value[0] ?? null)}
            positioning={{ sameWidth: true }}
            required={false}
            value={field.value ? [field.value] : []}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Selecione uma lista" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content maxH={320}>
                <Box
                  bg="bg"
                  onPointerDown={(e) => e.stopPropagation()}
                  pb={2}
                  position="sticky"
                  pt={2}
                  px={2}
                  top={0}
                  zIndex={1}
                >
                  <InputGroup endElement={<Icon as={RiSearchLine} boxSize={4} />}>
                    <Input
                      _focusVisible={{ outline: 'none' }}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Buscar lista..."
                      size="sm"
                      value={searchQuery}
                    />
                  </InputGroup>
                </Box>
                {filteredLists.length === 0 ? (
                  <Box color="fg.muted" pb={3} pt={1} px={3} textAlign="center">
                    <Text fontSize="sm">Nenhuma lista encontrada</Text>
                  </Box>
                ) : (
                  collection.items.map((item) => (
                    <Select.Item item={item} key={item.id}>
                      {item.name} (Clientes:{' '}
                      {(item.memberCount ?? 0).toLocaleString('pt-BR')})
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))
                )}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        )}
      />
      <Field.HelperText>
        <RouterLink to="/customers/custom-send-lists">
          Criar ou gerenciar listas personalizadas
        </RouterLink>
      </Field.HelperText>
      {showError ? <Field.ErrorText>{error?.message}</Field.ErrorText> : null}
    </Field.Root>
  )
}
