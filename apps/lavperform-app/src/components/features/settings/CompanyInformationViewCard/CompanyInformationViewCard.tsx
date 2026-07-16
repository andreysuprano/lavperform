import { Box, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/context/AuthContext'
import { companyService } from '@/services'
import type { Company } from '@/types'
import { logger } from '@/utils/logger'
import { formatCep, formatCnpj, formatTelefone } from '@/utils/mask'

import { EditCompanyAvatarForm } from '../EditCompanyAvatarForm/EditCompanyAvatarForm'
import { EditCompanyForm } from '../EditCompanyForm/EditCompanyForm'

function Item(props: { label: string; value: React.ReactNode }) {
  return (
    <Box mb={2}>
      <Text
        color="gray.600"
        fontSize="xs"
      >
        {props.label}
      </Text>
      {props.value}
    </Box>
  )
}

export const CompanyInformationViewCard = () => {
  const { selectedCompany } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)

  const loadCompanyData = useCallback(async () => {
    if (!selectedCompany?.id) return

    try {
      const response = await companyService.getCompany(selectedCompany.id)
      setCompany(response.data)
    } catch (error) {
      logger.error('Erro ao carregar dados da empresa:', error)
    }
  }, [selectedCompany?.id])

  useEffect(() => {
    loadCompanyData()
  }, [loadCompanyData])

  if (!company) {
    return null
  }

  return (
    <Card.Root size="sm">
      <Card.Header
        flexDirection="row"
        justifyContent="space-between"
      >
        <Card.Title>Dados da Empresa</Card.Title>
        <EditCompanyForm
          company={company}
          onClose={loadCompanyData}
          onSuccess={loadCompanyData}
        />
      </Card.Header>
      <Card.Body>
        <HStack
          alignItems="flex-start"
          gap={4}
          wrap="wrap"
        >
          <EditCompanyAvatarForm
            company={company}
            onClose={loadCompanyData}
            onSuccess={loadCompanyData}
          />
          <HStack
            alignItems="flex-start"
            gap={4}
            wrap="wrap"
          >
            <Box mr={10}>
              <Item
                label="Nome"
                value={<Text>{company.name}</Text>}
              />
              <Item
                label="CNPJ"
                value={<Text>{formatCnpj(company.cnpj)}</Text>}
              />
            </Box>
            <Box mr={10}>
              <Item
                label="Telefone"
                value={<Text>{formatTelefone(company.phone)}</Text>}
              />
              <Item
                label="E-mail"
                value={<Text>{company.email}</Text>}
              />
            </Box>
            <Box>
              <Item
                label="Endereço"
                value={
                  <VStack
                    align="flex-start"
                    as={Box}
                    gap={0}
                  >
                    <Text>
                      {company.address.street}, {company.address.number}
                      {company.address.complement &&
                        `, ${company.address.complement}`}
                    </Text>
                    <Text>
                      {company.address.neighborhood} - {company.address.city}/
                      {company.address.state}
                    </Text>
                    <Text>CEP: {formatCep(company.address.zipCode)}</Text>
                  </VStack>
                }
              />
            </Box>
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
