import { Badge, Image, Table, Text, useDisclosure } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import {
  CreateWeekEventForm,
  CustomTable,
  EditWeekEventForm,
  LoadingState,
} from '@/components'
import { useAllWeekEvents } from '@/hooks/queries'
import type { WeekEvent } from '@/types'
import { formatDateTime } from '@/utils/date'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

function WeekEventList() {
  const { data, isLoading } = useAllWeekEvents()

  const [selectedEvent, setSelectedEvent] = useState<WeekEvent | null>(null)

  const {
    open: isEditFormOpen,
    onOpen: onEditFormOpen,
    onClose: onEditFormClose,
  } = useDisclosure()

  const weekEvents = data || []

  const handleEdit = useCallback(
    (event: WeekEvent) => {
      setSelectedEvent(event)
      onEditFormOpen()
    },
    [onEditFormOpen]
  )

  const handleEditFormClose = useCallback(() => {
    setSelectedEvent(null)
    onEditFormClose()
  }, [onEditFormClose])

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <>
      <CreateWeekEventForm />

      <CustomTable<WeekEvent>
        css={tableStickyStyles}
        data={weekEvents}
        emptyStateMessage="Nenhum evento encontrado"
        handleLimitChange={() => {}}
        handlePageChange={() => {}}
        header={
          <>
            <Table.ColumnHeader>Imagem</Table.ColumnHeader>
            <Table.ColumnHeader>Título</Table.ColumnHeader>
            <Table.ColumnHeader>Data do Evento</Table.ColumnHeader>
            <Table.ColumnHeader>Stream</Table.ColumnHeader>
            <Table.ColumnHeader>CTA</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
      >
        {weekEvents.map((event) => (
          <Table.Row
            cursor="pointer"
            key={event.id}
            onClick={() => handleEdit(event)}
          >
            <Table.Cell minW={100}>
              <Image
                alt={event.title}
                borderRadius="md"
                h={50}
                objectFit="cover"
                src={event.coverImage}
                w={80}
              />
            </Table.Cell>
            <Table.Cell minW={250}>
              <Text
                fontWeight="medium"
                lineClamp={2}
              >
                {event.title}
              </Text>
              <Text
                color="gray.500"
                fontSize="sm"
                lineClamp={1}
              >
                {event.description}
              </Text>
            </Table.Cell>
            <Table.Cell minW={180}>
              <Text fontSize="sm">{formatDateTime(event.eventDate)}</Text>
            </Table.Cell>
            <Table.Cell minW={100}>
              <Badge colorScheme={event.isStream ? 'green' : 'gray'}>
                {event.isStream ? 'Ao vivo' : 'Gravado'}
              </Badge>
            </Table.Cell>
            <Table.Cell minW={150}>
              <Text
                fontSize="sm"
                fontWeight="medium"
              >
                {event.ctaLabel}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>

      {selectedEvent && (
        <EditWeekEventForm
          event={selectedEvent}
          isOpen={isEditFormOpen}
          onClose={handleEditFormClose}
        />
      )}
    </>
  )
}

export { WeekEventList }
