import { Box, Button, Card, HStack, Link, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { LuPencil, LuTrash2 } from 'react-icons/lu'

import { ZoomableImage } from '@/components'

import type { CampaignCreative } from './FormSteps.types'

type Props = {
  creative: CampaignCreative
  isReadOnly?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

function CreativeCardComponent({
  creative,
  isReadOnly,
  onEdit,
  onDelete,
}: Props) {
  const previewImage =
    creative.image?.base64 ||
    creative.image?.url ||
    (creative.imageUrls ?? []).find((u) => typeof u === 'string' && u.trim().length > 0) ||
    ''

  return (
    <Card.Root
      size="sm"
      variant="subtle"
      w="full"
    >
      <Card.Body gap={3}>
        {previewImage ? (
          <ZoomableImage
            alt={creative.title ?? 'Criativo'}
            src={previewImage}
          />
        ) : (
          <Box
            alignItems="center"
            bg="bg.muted"
            borderRadius="md"
            color="fg.muted"
            display="flex"
            justifyContent="center"
            minH="140px"
            w="full"
          >
            <Text fontSize="sm">Sem imagem</Text>
          </Box>
        )}

        {(creative.title || creative.description || creative.link) && (
          <Stack gap={1}>
            {!!creative.title && (
              <Text
                fontWeight={600}
                lineClamp={1}
              >
                {creative.title}
              </Text>
            )}
            {!!creative.description && (
              <Text
                color="fg.muted"
                fontSize="sm"
                lineClamp={3}
              >
                {creative.description}
              </Text>
            )}
            {!!creative.link && (
              <Link
                color="fg.info"
                href={creative.link}
                lineClamp={1}
                rel="noreferrer"
                target="_blank"
              >
                {creative.link}
              </Link>
            )}
          </Stack>
        )}
      </Card.Body>

      {!isReadOnly && (
        <Card.Footer>
          <HStack
            justify="flex-end"
            w="full"
          >
            <Button
              onClick={() => onEdit?.(creative.id)}
              size="xs"
              variant="surface"
            >
              <LuPencil />
              Editar
            </Button>
            <Button
              colorPalette="red"
              onClick={() => onDelete?.(creative.id)}
              size="xs"
              variant="surface"
            >
              <LuTrash2 />
              Excluir
            </Button>
          </HStack>
        </Card.Footer>
      )}
    </Card.Root>
  )
}

export const CreativeCard = memo(CreativeCardComponent)
