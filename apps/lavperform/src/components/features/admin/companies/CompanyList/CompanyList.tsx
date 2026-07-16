import { Badge, Flex, Input, Table, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  CompanyDetailsDrawer,
  CreateCompanyForm,
  CustomTable,
} from '@/components'
import { useAllCompanies } from '@/hooks/queries'
import type { Company } from '@/types'
import { companyStateOptions } from '@/utils/constants/companyState'
import { formatCnpj, formatTelefone } from '@/utils/mask'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

function CompanyList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    orderBy: 'createdAt',
    orderDirection: 'desc' as 'asc' | 'desc',
  })

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(debouncedSearchQuery && { name: debouncedSearchQuery }),
    }),
    [params, debouncedSearchQuery]
  )

  const { data, isLoading } = useAllCompanies(queryParams)

  const companies = data?.items ?? []
  const meta = data?.meta

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Debounce do searchQuery
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Atualiza params quando o searchQuery debounced muda
  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearchQuery])

  const handleLimitChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }))
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearch(e.target.value)
    },
    [handleSearch]
  )

  const handleCompanySelect = useCallback((company: any) => {
    setSelectedCompany(company)
  }, [])

  const handleCompanyClose = useCallback(() => {
    setSelectedCompany(null)
  }, [])

  return (
    <>
      <Flex
        alignItems="center"
        flexDirection={{ base: 'column', md: 'row' }}
        gap={2}
      >
        <Input
          bg="bg"
          onChange={handleSearchChange}
          placeholder="Pesquisar empresa..."
          value={searchQuery}
        />
        {/* TODO: adicionar filtro de Status */}
        <CreateCompanyForm />
      </Flex>
      <CustomTable<Company>
        css={tableStickyStyles}
        data={companies}
        emptyStateMessage="Nenhuma empresa encontrada"
        handleLimitChange={handleLimitChange}
        handlePageChange={handlePageChange}
        header={
          <>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>Cnpj</Table.ColumnHeader>
            <Table.ColumnHeader>Email</Table.ColumnHeader>
            <Table.ColumnHeader>Telefone</Table.ColumnHeader>
            <Table.ColumnHeader>Slug</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={meta}
      >
        {companies.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => handleCompanySelect(item)}
          >
            <Table.Cell>
              <Badge
                colorPalette={companyStateOptions.find(item.state)?.color}
                variant="solid"
              >
                {companyStateOptions.find(item.state)?.label}
              </Badge>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{item.name}</Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{formatCnpj(item.cnpj)}</Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{item.email}</Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{formatTelefone(item.phone)}</Text>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{item.slug}</Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
      {selectedCompany && (
        <CompanyDetailsDrawer
          companyId={selectedCompany.id}
          onClose={handleCompanyClose}
        />
      )}
    </>
  )
}

export { CompanyList }
