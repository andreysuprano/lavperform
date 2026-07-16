import { Card, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './BillingInfoCard.types'

const formatCpfCnpj = (value: string | undefined | null): string => {
  if (!value) return 'N/A'
  const cleanValue = value.replace(/\D/g, '')

  if (cleanValue.length === 14) {
    return cleanValue.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
  }

  if (cleanValue.length === 11) {
    return cleanValue.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  return cleanValue
}

function BillingInfoCardComponent({ company }: Props) {
  return (
    <Card.Root
      borderRadius="lg"
      variant="elevated"
    >
      <Card.Header pb={4}>
        <Text
          fontSize="lg"
          fontWeight="semibold"
        >
          Informações de faturamento
        </Text>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack gap={5}>
          <Stack gap={1}>
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
              textTransform="uppercase"
            >
              CNPJ/CPF
            </Text>
            <Text
              fontSize="md"
              fontWeight="medium"
            >
              {formatCpfCnpj(company?.cnpj)}
            </Text>
          </Stack>
          <Stack gap={1}>
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
              textTransform="uppercase"
            >
              Razão Social/Nome
            </Text>
            <Text
              fontSize="md"
              fontWeight="medium"
            >
              {company?.name || 'N/A'}
            </Text>
          </Stack>
          <Stack gap={1}>
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
              textTransform="uppercase"
            >
              Endereço de faturamento
            </Text>
            <Text
              fontSize="sm"
              lineHeight="tall"
            >
              {company?.address
                ? `${company.address.street}, ${company.address.number}   ${company.address.neighborhood}, ${company.address.city}/${company.address.state}   CEP: ${company.address.zipCode}`
                : 'Carregando endereço...'}
            </Text>
          </Stack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const BillingInfoCard = memo(
  BillingInfoCardComponent
) as typeof BillingInfoCardComponent

export { BillingInfoCard, type Props as BillingInfoCardProps }
