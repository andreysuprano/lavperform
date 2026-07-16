import { Badge, Card, Skeleton, Table, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { Empty } from '@/components'
import { getWeatherConditionLabel } from '@/whitelabel/utils'
import type { WeatherCondition } from '@/whitelabel/types'

import { Props } from './WeatherHistoryCard.types'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function WeatherHistoryCardBase({
  history = [],
  isLoading = false,
  onAlertClick,
}: Props) {
  const hasHistory = history.length > 0

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Histórico de Envios de Alertas</Card.Title>
        <Card.Description>
          Veja os alertas que foram enviados aos seus clientes
        </Card.Description>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <Skeleton height="200px" />
        ) : !hasHistory ? (
          <Empty
            description="Nenhum alerta enviado ainda. Os alertas aparecerão aqui após serem disparados."
            title="Nenhum alerta enviado"
          />
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Data</Table.ColumnHeader>
                <Table.ColumnHeader>Condição</Table.ColumnHeader>
                <Table.ColumnHeader>Temperatura</Table.ColumnHeader>
                <Table.ColumnHeader>Mensagens Enviadas</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {history.map((alert) => (
                <Table.Row
                  key={alert.id}
                  cursor={onAlertClick ? 'pointer' : 'default'}
                  // onClick={() => onAlertClick?.(alert)}
                  _hover={
                    onAlertClick
                      ? {
                          bg: 'bg.muted',
                        }
                      : undefined
                  }
                >
                  <Table.Cell>
                    <Text fontSize="sm">{formatDate(alert.createdAt)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette="purple"
                      variant="subtle"
                    >
                      {getWeatherConditionLabel(
                        alert.condition as WeatherCondition
                      )}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{alert.tempC}°C</Table.Cell>
                  <Table.Cell>{alert.messagesSent}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Card.Body>
    </Card.Root>
  )
}

const WeatherHistoryCard = memo(
  WeatherHistoryCardBase
) as typeof WeatherHistoryCardBase

export { WeatherHistoryCard, type Props as WeatherHistoryCardProps }
