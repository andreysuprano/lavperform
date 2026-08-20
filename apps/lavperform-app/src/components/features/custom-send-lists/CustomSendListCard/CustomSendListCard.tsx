import {
  Box,
  Button,
  Card,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { LuCalendar, LuList, LuPen, LuTrash2, LuUsers } from 'react-icons/lu'

import { DeleteConfirmationDialog } from '@/components'
import type { CustomSendList } from '@/types'

export type CustomSendListCardProps = {
  list: CustomSendList
  isDeleting?: boolean
  onEdit: (list: CustomSendList) => void
  onDelete: (list: CustomSendList) => void | Promise<void>
}

function CustomSendListCardBase({
  list,
  isDeleting = false,
  onEdit,
  onDelete,
}: CustomSendListCardProps) {
  const memberCount = list.memberCount ?? 0
  const updatedAt = new Date(list.updatedAt).toLocaleDateString('pt-BR')

  return (
    <Card.Root
      _hover={{
        boxShadow: 'md',
        transform: 'translateY(-1px)',
      }}
      borderWidth="1px"
      cursor="pointer"
      h="full"
      onClick={() => onEdit(list)}
      overflow="hidden"
      size="sm"
      transition="box-shadow 0.2s ease, transform 0.2s ease"
    >
      <Card.Body display="flex" flexDirection="column" gap={3} h="full">
        <HStack align="flex-start" gap={3} justify="space-between">
          <Stack flex={1} gap={1} minW={0}>
            <Text fontSize="md" fontWeight="bold" lineClamp={1}>
              {list.name}
            </Text>
            {list.description ? (
              <Text color="fg.muted" fontSize="sm" lineClamp={2}>
                {list.description}
              </Text>
            ) : (
              <Text color="fg.subtle" fontSize="sm">
                Sem descrição
              </Text>
            )}
          </Stack>

          <HStack
            bg="bg.muted"
            borderRadius="lg"
            flexShrink={0}
            gap={1.5}
            px={2.5}
            py={1.5}
          >
            <Box color="fg.muted" fontSize="md">
              <LuUsers size={16} />
            </Box>
            <Stack gap={0} lineHeight="1.1">
              <Text fontSize="sm" fontWeight="bold">
                {memberCount}
              </Text>
              <Text color="fg.muted" fontSize="2xs">
                {memberCount === 1 ? 'cliente' : 'clientes'}
              </Text>
            </Stack>
          </HStack>
        </HStack>

        <Stack bg="bg.subtle" borderRadius="md" flex={1} gap={1.5} p={3}>
          <Text
            color="fg.muted"
            fontSize="xs"
            fontWeight="semibold"
            textTransform="uppercase"
          >
            Tipo de lista
          </Text>
          <HStack color="fg.muted" fontSize="sm" gap={2}>
            <LuList size={14} />
            <Text>Seleção manual de clientes</Text>
          </HStack>
        </Stack>

        <HStack color="fg.muted" fontSize="xs" gap={1.5}>
          <LuCalendar size={14} />
          <Text>Atualizada em {updatedAt}</Text>
        </HStack>

        <HStack borderTopWidth="1px" gap={2} justify="flex-end" pt={3}>
          <Box onClick={(event) => event.stopPropagation()}>
            <DeleteConfirmationDialog
              description="Campanhas que usam essa lista podem ser afetadas. Essa ação não pode ser desfeita."
              isLoading={isDeleting}
              onClick={() => onDelete(list)}
              title="Excluir esta lista?"
              trigger={
                <Button colorPalette="red" size="sm" variant="ghost">
                  <LuTrash2 />
                  Excluir
                </Button>
              }
            />
          </Box>
          <Button
            onClick={(event) => {
              event.stopPropagation()
              onEdit(list)
            }}
            size="sm"
            variant="outline"
          >
            <LuPen />
            Editar
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

const CustomSendListCard = memo(CustomSendListCardBase) as typeof CustomSendListCardBase

export { CustomSendListCard }
