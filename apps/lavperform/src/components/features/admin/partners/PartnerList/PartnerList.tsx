import { Avatar, Flex, Input, Table, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CustomTable, toaster } from '@/components'
import { useWhiteLabel } from '@/config'
import { useAllPartners } from '@/hooks/queries'
import type { Partner } from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import { formatCnpj, formatTelefone } from '@/utils/mask'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

import { CreatePartnerForm } from '../CreatePartnerForm/CreatePartnerForm'

function PartnerList() {
  const { colors } = useWhiteLabel()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    orderBy: 'createdAt',
    orderDirection: 'desc' as 'asc' | 'desc',
  })

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(debouncedSearchQuery && { name: debouncedSearchQuery }),
    }),
    [params, debouncedSearchQuery]
  )

  const { data, isLoading } = useAllPartners(queryParams)

  const partners = data ?? []

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

  const handlePartnerSelect = useCallback((partner: Partner) => {
    // TODO: Implementar drawer de detalhes quando necessário
    console.log('Partner selected:', partner)
  }, [])

  const handleCopyText = useCallback(
    async (text: string, e: React.MouseEvent) => {
      e.stopPropagation()

      const success = await copyToClipboard(text)

      if (success) {
        toaster.create({
          title: 'Link copiado!',
          description: 'Link do parceiro copiado para a área de transferência.',
          type: 'success',
          duration: 2000,
        })
      } else {
        toaster.create({
          title: 'Erro ao copiar',
          description: 'Não foi possível copiar o link.',
          type: 'error',
          duration: 2000,
        })
      }
    },
    []
  )

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
          placeholder="Pesquisar parceiro..."
          value={searchQuery}
        />
        <CreatePartnerForm onClose={() => {}} />
      </Flex>
      <CustomTable<Partner>
        css={tableStickyStyles}
        data={partners}
        emptyStateMessage="Nenhum parceiro encontrado"
        handleLimitChange={handleLimitChange}
        handlePageChange={handlePageChange}
        header={
          <>
            <Table.ColumnHeader>Link</Table.ColumnHeader>
            <Table.ColumnHeader>Avatar</Table.ColumnHeader>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>CNPJ</Table.ColumnHeader>
            <Table.ColumnHeader>Email</Table.ColumnHeader>
            <Table.ColumnHeader>Telefone</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
      >
        {partners.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => handlePartnerSelect(item)}
          >
            <Table.Cell
              cursor="copy"
              maxW={200}
              onClick={(e) =>
                handleCopyText(
                  `${import.meta.env.VITE_PRO_URL}/register-company/${item.id}`,
                  e
                )
              }
            >
              <Text
                color={colors.primary}
                fontFamily="mono"
                fontSize="sm"
                fontWeight="bolder"
                lineClamp={1}
              >
                {`${import.meta.env.VITE_PRO_URL}/register-company/${item.id}`}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Avatar.Root size="sm">
                <Avatar.Image
                  alt={item.name}
                  src={item.avatarUrl}
                />
                <Avatar.Fallback name={item.name} />
              </Avatar.Root>
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
          </Table.Row>
        ))}
      </CustomTable>
    </>
  )
}

export { PartnerList }
