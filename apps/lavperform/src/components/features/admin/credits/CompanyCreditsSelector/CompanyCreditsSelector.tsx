import {
  Box,
  createListCollection,
  Icon,
  Input,
  InputGroup,
  Select as ChakraSelect,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RiSearchLine } from 'react-icons/ri'

import { useAllCompanies } from '@/hooks/queries'
import type { Company } from '@/types'

interface Props {
  selectedCompanyId?: string
  onCompanyChange: (companyId: string, company?: Company) => void
}

export function CompanyCreditsSelector({
  selectedCompanyId,
  onCompanyChange,
}: Props) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)

    return () => clearTimeout(timeout)
  }, [search])

  const params = useMemo(
    () => ({
      page: 1,
      limit: 50,
      orderBy: 'name',
      orderDirection: 'asc' as const,
      ...(debouncedSearch && { name: debouncedSearch }),
    }),
    [debouncedSearch]
  )

  const { data, isLoading } = useAllCompanies(params)
  const companies = useMemo(() => data?.items ?? [], [data?.items])

  const collection = useMemo(
    () =>
      createListCollection({
        items: companies.map((company) => ({
          label: company.name,
          value: company.id,
        })),
      }),
    [companies]
  )

  const handleChange = useCallback(
    ({ value }: { value: string[] }) => {
      const companyId = value[0]
      const company = companies.find((item) => item.id === companyId)
      onCompanyChange(companyId, company)
    },
    [companies, onCompanyChange]
  )

  const handleOpenChange = useCallback((details: { open: boolean }) => {
    if (!details.open) {
      setSearch('')
    }
  }, [])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <Box
      bg="bg"
      borderRadius="lg"
      borderWidth="1px"
      p={4}
    >
      <Text
        fontSize="sm"
        fontWeight="medium"
        mb={2}
      >
        Empresa gerenciada
      </Text>
      <ChakraSelect.Root
        collection={collection}
        disabled={isLoading && companies.length === 0}
        onOpenChange={handleOpenChange}
        onValueChange={handleChange}
        positioning={{ sameWidth: true }}
        value={selectedCompanyId ? [selectedCompanyId] : []}
      >
        <ChakraSelect.HiddenSelect />
        <ChakraSelect.Control>
          <ChakraSelect.Trigger>
            <ChakraSelect.ValueText placeholder="Selecione uma empresa">
              {selectedCompany?.name}
            </ChakraSelect.ValueText>
          </ChakraSelect.Trigger>
          <ChakraSelect.IndicatorGroup>
            <ChakraSelect.Indicator />
          </ChakraSelect.IndicatorGroup>
        </ChakraSelect.Control>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content maxH={360}>
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
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Buscar empresa..."
                  size="sm"
                  value={search}
                />
              </InputGroup>
            </Box>
            {isLoading ? (
              <Box
                color="fg.muted"
                pb={3}
                pt={1}
                px={3}
                textAlign="center"
              >
                <Text fontSize="sm">Carregando...</Text>
              </Box>
            ) : companies.length === 0 ? (
              <Box
                color="fg.muted"
                pb={3}
                pt={1}
                px={3}
                textAlign="center"
              >
                <Text fontSize="sm">Nenhuma empresa encontrada</Text>
              </Box>
            ) : (
              collection.items.map((item) => (
                <ChakraSelect.Item
                  item={item}
                  key={item.value}
                >
                  {item.label}
                  <ChakraSelect.ItemIndicator />
                </ChakraSelect.Item>
              ))
            )}
          </ChakraSelect.Content>
        </ChakraSelect.Positioner>
      </ChakraSelect.Root>
    </Box>
  )
}
