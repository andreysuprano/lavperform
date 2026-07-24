import {
  Box,
  Button,
  Card,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { LuCalendar, LuPen, LuTrash2, LuUsers } from 'react-icons/lu'

import { DeleteConfirmationDialog } from '@/components'
import type { Audience } from '@/types'

import { summarizeAudienceDefinition } from '../AudienceBuilder/audienceCopy'

export type AudienceCardProps = {
  audience: Audience
  isDeleting?: boolean
  onEdit: (audience: Audience) => void
  onDelete: (audience: Audience) => void | Promise<void>
}

function AudienceCardBase({
  audience,
  isDeleting = false,
  onEdit,
  onDelete,
}: AudienceCardProps) {
  const { includeSummary, excludeSummary } = summarizeAudienceDefinition(
    audience.definition,
  )
  const customerCount = audience.customerCount ?? 0
  const updatedAt = new Date(audience.updatedAt).toLocaleDateString('pt-BR')

  return (
    <Card.Root
      borderWidth="1px"
      cursor="pointer"
      h="full"
      onClick={() => onEdit(audience)}
      overflow="hidden"
      size="sm"
      transition="box-shadow 0.2s ease, transform 0.2s ease"
      _hover={{
        boxShadow: 'md',
        transform: 'translateY(-1px)',
      }}
    >
      <Card.Body
        display="flex"
        flexDirection="column"
        gap={3}
        h="full"
      >
        <HStack
          align="flex-start"
          justify="space-between"
          gap={3}
        >
          <Stack
            flex={1}
            gap={1}
            minW={0}
          >
            <Text
              fontSize="md"
              fontWeight="bold"
              lineClamp={1}
            >
              {audience.name}
            </Text>
            {audience.description ? (
              <Text
                color="fg.muted"
                fontSize="sm"
                lineClamp={2}
              >
                {audience.description}
              </Text>
            ) : (
              <Text
                color="fg.subtle"
                fontSize="sm"
              >
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
            <Box
              color="fg.muted"
              fontSize="md"
            >
              <LuUsers size={16} />
            </Box>
            <Stack
              gap={0}
              lineHeight="1.1"
            >
              <Text
                fontSize="sm"
                fontWeight="bold"
              >
                {customerCount}
              </Text>
              <Text
                color="fg.muted"
                fontSize="2xs"
              >
                {customerCount === 1 ? 'cliente' : 'clientes'}
              </Text>
            </Stack>
          </HStack>
        </HStack>

        <Stack
          bg="bg.subtle"
          borderRadius="md"
          flex={1}
          gap={1.5}
          p={3}
        >
          <Text
            color="fg.muted"
            fontSize="xs"
            fontWeight="semibold"
            textTransform="uppercase"
          >
            Quem entra
          </Text>
          <Text
            fontSize="sm"
            lineClamp={3}
          >
            {includeSummary}
          </Text>
          {excludeSummary ? (
            <>
              <Text
                color="fg.muted"
                fontSize="xs"
                fontWeight="semibold"
                mt={1}
                textTransform="uppercase"
              >
                Quem fica de fora
              </Text>
              <Text
                fontSize="sm"
                lineClamp={2}
              >
                {excludeSummary}
              </Text>
            </>
          ) : null}
        </Stack>

        <HStack
          color="fg.muted"
          fontSize="xs"
          gap={1.5}
        >
          <LuCalendar size={14} />
          <Text>Atualizada em {updatedAt}</Text>
        </HStack>

        <HStack
          borderTopWidth="1px"
          gap={2}
          justify="flex-end"
          pt={3}
        >
          <Box onClick={(event) => event.stopPropagation()}>
            <DeleteConfirmationDialog
              description="Campanhas que usam essa lista podem ser afetadas. Essa ação não pode ser desfeita."
              isLoading={isDeleting}
              onClick={() => onDelete(audience)}
              title="Excluir esta audiência?"
              trigger={
                <Button
                  colorPalette="red"
                  size="sm"
                  variant="ghost"
                >
                  <LuTrash2 />
                  Excluir
                </Button>
              }
            />
          </Box>
          <Button
            onClick={(event) => {
              event.stopPropagation()
              onEdit(audience)
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

const AudienceCard = memo(AudienceCardBase) as typeof AudienceCardBase

export { AudienceCard }
