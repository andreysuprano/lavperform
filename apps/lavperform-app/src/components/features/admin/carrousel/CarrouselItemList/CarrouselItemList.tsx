import { Badge, Image, Table, Text, useDisclosure } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import {
  CreateCarrouselItemForm,
  CustomTable,
  EditCarrouselItemForm,
  LoadingState,
} from '@/components'
import { useCarrouselItems } from '@/hooks/queries'
import type { CarrouselItem } from '@/types'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

function CarrouselItemList() {
  const { data, isLoading } = useCarrouselItems()

  const [selectedItem, setSelectedItem] = useState<CarrouselItem | null>(null)

  const {
    open: isEditFormOpen,
    onOpen: onEditFormOpen,
    onClose: onEditFormClose,
  } = useDisclosure()

  const carrouselItems = data || []

  const handleEdit = useCallback(
    (item: CarrouselItem) => {
      setSelectedItem(item)
      onEditFormOpen()
    },
    [onEditFormOpen]
  )

  const handleEditFormClose = useCallback(() => {
    setSelectedItem(null)
    onEditFormClose()
  }, [onEditFormClose])

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <>
      <CreateCarrouselItemForm allItems={carrouselItems} />

      <CustomTable<CarrouselItem>
        css={tableStickyStyles}
        data={carrouselItems}
        emptyStateMessage="Nenhum item do carrousel encontrado"
        handleLimitChange={() => {}}
        handlePageChange={() => {}}
        header={
          <>
            <Table.ColumnHeader>Imagem</Table.ColumnHeader>
            <Table.ColumnHeader>Título</Table.ColumnHeader>
            <Table.ColumnHeader>Ordem</Table.ColumnHeader>
            <Table.ColumnHeader>Stream</Table.ColumnHeader>
            <Table.ColumnHeader>CTA</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
      >
        {carrouselItems.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => handleEdit(item)}
          >
            <Table.Cell minW={100}>
              <Image
                alt={item.title}
                borderRadius="md"
                h={50}
                objectFit="cover"
                src={item.thumbnailUrl}
                w={80}
              />
            </Table.Cell>
            <Table.Cell minW={250}>
              <Text
                fontWeight="medium"
                lineClamp={2}
              >
                {item.title}
              </Text>
              <Text
                color="gray.500"
                fontSize="sm"
                lineClamp={1}
              >
                {item.description}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge colorScheme="blue">{item.order}</Badge>
            </Table.Cell>
            <Table.Cell>
              <Badge colorScheme={item.isStream ? 'green' : 'gray'}>
                {item.isStream ? 'Ao vivo' : 'Vídeo'}
              </Badge>
            </Table.Cell>
            <Table.Cell minW={150}>
              <Text
                fontSize="sm"
                fontWeight="medium"
              >
                {item.ctaLabel}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>

      {selectedItem && (
        <EditCarrouselItemForm
          allItems={carrouselItems}
          isOpen={isEditFormOpen}
          item={selectedItem}
          onClose={handleEditFormClose}
        />
      )}
    </>
  )
}

export { CarrouselItemList }
