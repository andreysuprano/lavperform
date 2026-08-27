import {
  Avatar,
  Box,
  createListCollection,
  HStack,
  Icon,
  Input,
  InputGroup,
  Select,
  Text,
  useSelectContext,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { RiSearchLine } from 'react-icons/ri'

import { convertLinkToResizedImage } from '@/firebase/storage'
import type { UserCompany } from '@/types'
import { useWhiteLabel, getBusinessCopy } from '@/config'

import { Props } from './OrganizationSelect.types'

function normalizeCompanySearch(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

const SelectedValue = () => {
  const select = useSelectContext()
  const items = select.selectedItems as Array<UserCompany>
  const { theme } = useWhiteLabel()
  const placeholder = getBusinessCopy(theme).unitSelectPlaceholder

  if (items.length === 0) {
    return <Select.ValueText placeholder={placeholder} />
  }

  const { name, avatarUrl } = items[0]
  return (
    <Select.ValueText placeholder={placeholder}>
      <HStack>
        <Avatar.Root
          key={avatarUrl}
          shape="rounded"
          size="2xs"
        >
          <Avatar.Image
            alt={name}
            src={convertLinkToResizedImage(avatarUrl)}
          />
          <Avatar.Fallback name={name} />
        </Avatar.Root>
        <Text lineClamp={1}>{name}</Text>
      </HStack>
    </Select.ValueText>
  )
}

function OrganizationSelect({
  companies,
  selectedCompany,
  onCompanyChange,
  showLabel,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const showSearchField = companies.length > 10

  const filteredCompanies = useMemo(() => {
    if (!showSearchField) return companies
    const q = normalizeCompanySearch(searchQuery)
    if (!q) return companies
    return companies.filter((c) =>
      normalizeCompanySearch(c.name).includes(q)
    )
  }, [companies, searchQuery, showSearchField])

  const companiesCollection = useMemo(
    () =>
      createListCollection({
        items: filteredCompanies,
        itemToString: (item) => item.name,
        itemToValue: (item) => item.id,
      }),
    [filteredCompanies]
  )

  const handleOpenChange = useCallback(
    (details: { open: boolean }) => {
      if (!details.open) {
        setSearchQuery('')
      }
    },
    []
  )

  return (
    <Select.Root
      collection={companiesCollection}
      minW={240}
      onOpenChange={handleOpenChange}
      onValueChange={onCompanyChange}
      positioning={{ sameWidth: true }}
      size="sm"
      value={selectedCompany ? [selectedCompany.id] : []}
      w="full"
    >
      <Select.HiddenSelect />
      {showLabel && <Select.Label>Selecione a organização</Select.Label>}
      <Select.Control>
        <Select.Trigger cursor={'pointer'}>
          <SelectedValue />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner zIndex={11}>
        <Select.Content maxH={320}>
          {showSearchField && (
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
                  placeholder="Buscar empresa..."
                  size="sm"
                  value={searchQuery}
                />
              </InputGroup>
            </Box>
          )}
          {filteredCompanies.length === 0 ? (
            <Box color="fg.muted" pb={3} pt={1} px={3} textAlign="center">
              <Text fontSize="sm">Nenhuma empresa encontrada</Text>
            </Box>
          ) : (
            filteredCompanies.map((item) => (
              <Select.Item
                cursor={'pointer'}
                item={item}
                justifyContent="flex-start"
                key={item.id}
              >
                <Avatar.Root
                  key={item.avatarUrl}
                  shape="rounded"
                  size="2xs"
                >
                  <Avatar.Image
                    alt={item.name}
                    src={convertLinkToResizedImage(item.avatarUrl)}
                  />
                  <Avatar.Fallback name={item.name} />
                </Avatar.Root>
                {item.name}
                <Select.ItemIndicator />
              </Select.Item>
            ))
          )}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
export { OrganizationSelect, type Props as OrganizationSelectProps }
