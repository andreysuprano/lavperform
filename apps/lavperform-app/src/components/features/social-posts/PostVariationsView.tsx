import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { LuCopy, LuPencil, LuRefreshCw } from 'react-icons/lu'

import type {
  BrandIdentity,
  CaptionLength,
  PostVariation,
  SocialPostDraft,
} from '@/types'
import {
  activeCaptionText,
  captionWithHashtags,
  formatLabel,
  POST_OBJECTIVES,
} from '@/types'

import { PostArtwork } from './PostArtwork'

interface Props {
  draft: SocialPostDraft
  brand: Pick<
    BrandIdentity,
    'logoLightUrl' | 'logoDarkUrl' | 'titleFont' | 'bodyFont'
  >
  busy?: boolean
  onSelect: (variationId: string) => void
  onEdit: (variationId: string) => void
  onRegenerate: (variationId: string) => void
  onCaptionLength: (variationId: string, length: CaptionLength) => void
  onCaptionChange: (variationId: string, text: string) => void
  onRewrite: (variationId: string) => void
  onCopy: (variation: PostVariation) => void
  onMore: () => void
  onAdjustBriefing: () => void
}

export function PostVariationsView({
  draft,
  brand,
  busy,
  onSelect,
  onEdit,
  onRegenerate,
  onCaptionLength,
  onCaptionChange,
  onRewrite,
  onCopy,
  onMore,
  onAdjustBriefing,
}: Props) {
  const selected =
    draft.variations.find((item) => item.id === draft.selectedVariationId) ??
    draft.variations[0]
  const objective =
    POST_OBJECTIVES.find((item) => item.value === draft.objective)?.label ??
    draft.objective
  const caption = selected ? activeCaptionText(selected) : ''

  return (
    <Stack gap={4}>
      <Flex
        gap={3}
        justify="space-between"
        wrap="wrap"
      >
        <HStack
          color="fg.muted"
          fontSize="sm"
          wrap="wrap"
        >
          <Badge>{objective}</Badge>
          <Badge variant="outline">
            {formatLabel(draft.format, draft.slideCount)}
          </Badge>
          <Text>“{draft.theme.slice(0, 80)}”</Text>
        </HStack>
        <HStack>
          <Button
            onClick={onAdjustBriefing}
            variant="ghost"
          >
            Ajustar briefing
          </Button>
          <Button
            loading={busy}
            onClick={onMore}
            variant="outline"
          >
            Gerar mais 4
          </Button>
        </HStack>
      </Flex>
      <Grid
        gap={3}
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          xl: 'repeat(4, 1fr)',
        }}
      >
        {draft.variations.map((variation) => {
          const isSelected = variation.id === selected?.id
          const slide = variation.slides[0]
          return (
            <Card.Root
              borderColor={isSelected ? 'blue.400' : 'border'}
              borderWidth="2px"
              data-testid={`variation-card-${variation.position}`}
              key={variation.id}
            >
              <Card.Body gap={3}>
                {slide ? (
                  <PostArtwork
                    brand={brand}
                    format={draft.format}
                    slide={slide}
                  />
                ) : null}
                <Flex
                  align="center"
                  justify="space-between"
                >
                  <Text fontWeight="medium">
                    Variação {variation.position + 1}
                  </Text>
                  <Button
                    bg={isSelected ? '#E6F5FD' : 'transparent'}
                    borderColor={isSelected ? '#7BC9F1' : 'transparent'}
                    borderWidth="1px"
                    color="#093A58"
                    onClick={() => onSelect(variation.id)}
                    size="xs"
                    variant="outline"
                  >
                    {isSelected ? 'Selecionada' : 'Rascunho'}
                  </Button>
                </Flex>
                <HStack>
                  <Button
                    bg="#7BC9F1"
                    color="#093A58"
                    flex="1"
                    onClick={() => onEdit(variation.id)}
                    size="sm"
                  >
                    <LuPencil />
                    Revisar
                  </Button>
                  <Button
                    aria-label="Novo fundo"
                    loading={busy}
                    onClick={() => onRegenerate(variation.id)}
                    size="sm"
                    variant="outline"
                  >
                    <LuRefreshCw />
                  </Button>
                </HStack>
              </Card.Body>
            </Card.Root>
          )
        })}
      </Grid>
      {selected && (
        <Card.Root>
          <Card.Body gap={3}>
            <Flex
              align="center"
              justify="space-between"
              wrap="wrap"
            >
              <Heading size="sm">Legenda sugerida</Heading>
              <HStack>
                {(
                  [
                    ['short', 'Curta'],
                    ['medium', 'Média'],
                    ['long', 'Longa'],
                  ] as const
                ).map(([length, label]) => (
                  <Button
                    colorPalette={
                      selected.activeCaption === length ? 'blue' : 'gray'
                    }
                    key={length}
                    onClick={() => onCaptionLength(selected.id, length)}
                    size="xs"
                    variant={
                      selected.activeCaption === length ? 'solid' : 'outline'
                    }
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  loading={busy}
                  onClick={() => onRewrite(selected.id)}
                  size="xs"
                  variant="ghost"
                >
                  Reescrever
                </Button>
                <Button
                  data-testid="copy-caption"
                  onClick={() => onCopy(selected)}
                  size="xs"
                  variant="outline"
                >
                  <LuCopy />
                  Copiar legenda
                </Button>
              </HStack>
            </Flex>
            <Textarea
              onChange={(event) =>
                onCaptionChange(selected.id, event.target.value)
              }
              value={caption}
            />
            <Flex
              justify="space-between"
              wrap="wrap"
            >
              <HStack wrap="wrap">
                {selected.hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="subtle"
                  >
                    {tag}
                  </Badge>
                ))}
              </HStack>
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                {captionWithHashtags(selected).length}/2200 ·{' '}
                {selected.hashtags.length}/30 hashtags
              </Text>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}
      <Box
        bg="gray.900"
        borderRadius="lg"
        color="white"
        px={4}
        py={2}
      >
        <Text fontSize="sm">
          {draft.variations.length} variações prontas. A publicação continua
          manual: baixe a imagem no editor e cole a legenda.
        </Text>
      </Box>
    </Stack>
  )
}
