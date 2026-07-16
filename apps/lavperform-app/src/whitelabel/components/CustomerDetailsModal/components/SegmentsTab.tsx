import { Badge, Card, Table, Text } from '@chakra-ui/react'

import { useAuth } from '@/context/AuthContext'
import { useCustomerDetails } from '@/hooks/useCustomerDetails'
import { LoadingState } from '@/components'

type Props = {
  customerId: string
}

export function SegmentsTab({ customerId }: Props) {
  const { selectedCompany } = useAuth()
  const { segments, loading } = useCustomerDetails(
    selectedCompany?.id,
    customerId
  )

  if (loading) {
    return <LoadingState />
  }

  return (
    <Card.Root>
      <Card.Body p={0}>
        <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader scope="col">Segmento</Table.ColumnHeader>
            <Table.ColumnHeader scope="col">Status</Table.ColumnHeader>
            <Table.ColumnHeader scope="col">Origem</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {segments.map((item, index) => (
            <Table.Row key={index}>
              <Table.Cell>
                <Text fontWeight="medium">{item.segment}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  colorPalette={item.status === 'Ativo' ? 'green' : 'red'}
                  variant="solid"
                >
                  {item.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text>{item.origin}</Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      </Card.Body>
    </Card.Root>
  )
}
