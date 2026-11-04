import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuSparkles } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import { useColorModeValue } from '@/components/ui/color-mode'
import type { BrandIdentity, CreateDraftPayload } from '@/types'
import { ART_STYLES, DEFAULT_BRAND, POST_OBJECTIVES } from '@/types'

import { ReferenceImagesField } from './ReferenceImagesField'

interface Props {
  value: CreateDraftPayload
  brand?: BrandIdentity
  generating?: boolean
  notice?: string | null
  error?: string | null
  onChange: (value: CreateDraftPayload) => void
  onGenerate: () => void
  onReferences?: (ids: string[]) => void
  onUseReferenceModel?: (model: string) => void
}

export function PostBriefingForm({
  value,
  brand,
  generating,
  notice,
  error,
  onChange,
  onGenerate,
  onReferences,
  onUseReferenceModel,
}: Props) {
  const [neutralBrand, setNeutralBrand] = useState(false)
  const pillIdleBg = useColorModeValue('white', 'whiteAlpha.100')
  const pillIdleBorder = useColorModeValue('#E4E7EB', 'whiteAlpha.200')
  const pillIdleText = useColorModeValue('#093A58', 'gray.100')
  const pillActiveBg = useColorModeValue('#E6F5FD', 'rgba(123,201,241,0.16)')
  const formatIdleBg = useColorModeValue('white', 'gray.800')
  const formatActiveBg = useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)')
  const formatText = useColorModeValue('#093A58', 'gray.100')
  const formatActiveText = useColorModeValue('#093A58', '#7BC9F1')
  const formatMuted = useColorModeValue('#5B6B78', 'gray.400')
  const inviteTitle = useColorModeValue('#093A58', 'gray.100')
  const inviteBody = useColorModeValue('#5B6B78', 'gray.300')
  const canGenerate = value.theme.trim().length >= 8 && !generating
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'Enter' &&
        canGenerate
      ) {
        event.preventDefault()
        onGenerate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canGenerate, onGenerate])

  return (
    <Grid
      gap={4}
      templateColumns={{
        base: '1fr',
        xl: 'minmax(0, 1.7fr) minmax(280px, 0.8fr)',
      }}
    >
      <Card.Root>
        <Card.Body gap={5}>
          {notice && (
            <Box
              bg="orange.50"
              borderRadius="lg"
              color="orange.800"
              data-testid="brand-incomplete-notice"
              px={3}
              py={2}
              role="status"
            >
              <Text fontSize="sm">{notice}</Text>
            </Box>
          )}
          {error && (
            <Box
              bg="red.50"
              borderRadius="lg"
              color="red.800"
              data-testid="generation-error"
              px={3}
              py={2}
              role="alert"
            >
              <Text fontSize="sm">{error}</Text>
            </Box>
          )}
          <Flex justify="space-between">
            <Heading size="md">1. O que você quer postar?</Heading>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Passo 1 de 3
            </Text>
          </Flex>
          <Field.Root>
            <Field.Label>Objetivo</Field.Label>
            <HStack wrap="wrap">
              {POST_OBJECTIVES.map((objective) => {
                const active = value.objective === objective.value
                return (
                  <Button
                    bg={active ? pillActiveBg : pillIdleBg}
                    borderColor={active ? '#7BC9F1' : pillIdleBorder}
                    borderRadius="full"
                    color={active ? formatActiveText : pillIdleText}
                    key={objective.value}
                    onClick={() =>
                      onChange({ ...value, objective: objective.value })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {objective.label}
                  </Button>
                )
              })}
            </HStack>
          </Field.Root>
          <Field.Root>
            <Field.Label>Tema do post</Field.Label>
            <Textarea
              data-testid="briefing-theme"
              minH="120px"
              onChange={(event) =>
                onChange({ ...value, theme: event.target.value })
              }
              placeholder="20% de desconto na lavagem de edredons toda sexta-feira de novembro, com coleta grátis no bairro."
              value={value.theme}
            />
            <Field.HelperText>
              Diga o preço, o prazo e o bairro. Quanto mais concreto, melhor o
              resultado.
            </Field.HelperText>
          </Field.Root>
          <ReferenceImagesField
            companyId={value.companyId}
            imageModel={value.imageModel}
            onChange={(ids) => onReferences?.(ids)}
            onUseModel={onUseReferenceModel}
          />
          <Field.Root>
            <Field.Label>Formato</Field.Label>
            <Grid
              gap={2}
              templateColumns="repeat(3, minmax(0, 1fr))"
            >
              {(
                [
                  ['feed', 'Post', '1080×1080', 'square'],
                  ['carousel', 'Carrossel', 'até 10 páginas', 'pages'],
                  ['story', 'Story', '1080×1920', 'story'],
                ] as const
              ).map(([format, label, measure, icon]) => {
                const selected = value.format === format
                return (
                  <Button
                    bg={selected ? formatActiveBg : formatIdleBg}
                    borderColor={selected ? '#7BC9F1' : pillIdleBorder}
                    borderWidth="1px"
                    h="72px"
                    key={format}
                    onClick={() =>
                      onChange({
                        ...value,
                        format,
                        slideCount:
                          format === 'carousel'
                            ? value.format === 'carousel'
                              ? value.slideCount || 4
                              : 4
                            : 1,
                      })
                    }
                    px={2}
                    variant="outline"
                    w="full"
                  >
                    <HStack
                      gap={2}
                      w="full"
                    >
                      <FormatGlyph kind={icon} />
                      <Stack
                        align="flex-start"
                        gap={0}
                      >
                        <Text
                          color={selected ? formatActiveText : formatText}
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          {label}
                        </Text>
                        <Text
                          color={selected ? formatActiveText : formatMuted}
                          fontSize="xs"
                        >
                          {measure}
                        </Text>
                      </Stack>
                    </HStack>
                  </Button>
                )
              })}
            </Grid>
          </Field.Root>
          <Grid
            gap={3}
            templateColumns={{ base: '1fr', md: '1fr 1fr' }}
          >
            <Field.Root disabled={value.format !== 'carousel'}>
              <Field.Label>Nº de slides</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  onChange={(event) =>
                    onChange({
                      ...value,
                      slideCount: Number(event.target.value),
                    })
                  }
                  value={String(value.slideCount || 4)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                    <option
                      key={count}
                      value={count}
                    >
                      {count === 1 ? '1 slide' : `${count} slides`}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Estilo da arte</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  onChange={(event) =>
                    onChange({ ...value, artStyle: event.target.value })
                  }
                  value={value.artStyle}
                >
                  {ART_STYLES.map((style) => (
                    <option
                      key={style.value}
                      value={style.value}
                    >
                      {style.label}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
          <Checkbox.Root
            checked={value.includeCaption !== false}
            onCheckedChange={({ checked }) =>
              onChange({ ...value, includeCaption: checked === true })
            }
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              Legenda e hashtags no seu tom de voz.
            </Checkbox.Label>
          </Checkbox.Root>
          <Flex justify="flex-end">
            <Button
              bg="#7BC9F1"
              color="#093A58"
              data-testid="briefing-generate"
              disabled={!canGenerate}
              loading={generating}
              onClick={onGenerate}
            >
              <LuSparkles />
              Gerar 4 variações
            </Button>
          </Flex>
        </Card.Body>
      </Card.Root>
      <Stack gap={4}>
        {brand && !brand.persisted && !neutralBrand ? (
          <Card.Root
            border="1px dashed"
            borderColor="#7BC9F1"
            data-testid="brand-incomplete-notice"
          >
            <Card.Body gap={3}>
              <Flex
                gap={3}
              >
                <Box
                  borderRadius="md"
                  flexShrink={0}
                  h="112px"
                  opacity={0.55}
                  overflow="hidden"
                  position="relative"
                  w="84px"
                >
                  <Box
                    bg="url(/samples/post-background.svg) center/cover"
                    inset={0}
                    position="absolute"
                  />
                  <Box
                    bg="linear-gradient(to top, #093A58, transparent)"
                    bottom={0}
                    h="55%"
                    left={0}
                    position="absolute"
                    right={0}
                  />
                  <Text
                    bottom="7"
                    color="white"
                    fontSize="10px"
                    fontWeight="800"
                    left="1.5"
                    lineHeight="1.05"
                    position="absolute"
                    right="1.5"
                  >
                    Roupa limpa, sem esforço.
                  </Text>
                  <Text
                    bg="#FFD23F"
                    borderRadius="full"
                    bottom="1.5"
                    color="#093A58"
                    fontSize="8px"
                    fontWeight="700"
                    left="1.5"
                    position="absolute"
                    px="1"
                  >
                    20% OFF
                  </Text>
                </Box>
                <Stack gap={1}>
                  <Heading
                    color={inviteTitle}
                    size="sm"
                  >
                    Seus posts ficam com a cara da sua lavanderia
                  </Heading>
                  <Text
                    color={inviteBody}
                    fontSize="sm"
                  >
                    Configure sua logo, cores e fontes uma vez, e todo post já
                    sai pronto com a sua marca.
                  </Text>
                </Stack>
              </Flex>
              <Button
                asChild
                bg="#7BC9F1"
                color="#093A58"
              >
                <RouterLink
                  data-testid="configure-brand"
                  to="/settings/brand-identity"
                >
                  Configurar minha marca
                </RouterLink>
              </Button>
              <Button
                color={inviteTitle}
                data-testid="use-neutral-brand"
                onClick={() => setNeutralBrand(true)}
                variant="ghost"
              >
                Gerar sem marca por enquanto
              </Button>
            </Card.Body>
          </Card.Root>
        ) : (
          <Card.Root>
            <Card.Body gap={3}>
              <Flex justify="space-between">
                <Heading size="sm">
                  {neutralBrand ? 'Estilo neutro LavPerform' : 'Identidade aplicada'}
                </Heading>
                <Button
                  asChild
                  size="xs"
                  variant="ghost"
                >
                  <RouterLink to="/settings/brand-identity">Editar</RouterLink>
                </Button>
              </Flex>
              <HStack>
                {[
                  (neutralBrand ? DEFAULT_BRAND : brand)?.primaryColor,
                  (neutralBrand ? DEFAULT_BRAND : brand)?.deepColor,
                  (neutralBrand ? DEFAULT_BRAND : brand)?.accentColor,
                  (neutralBrand ? DEFAULT_BRAND : brand)?.neutralColor,
                ]
                  .filter(Boolean)
                  .map((color) => (
                    <Box
                      bg={color}
                      borderRadius="md"
                      borderWidth="1px"
                      h="6"
                      key={color}
                      w="6"
                    />
                  ))}
              </HStack>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {(neutralBrand ? DEFAULT_BRAND : brand)?.titleFont || 'Poppins'}{' '}
                / {(neutralBrand ? DEFAULT_BRAND : brand)?.bodyFont || 'Inter'}
              </Text>
            </Card.Body>
          </Card.Root>
        )}
        {generating && (
          <Card.Root>
            <Card.Body gap={2}>
              <Flex justify="space-between">
                <Heading size="sm">Gerando...</Heading>
                <Badge colorPalette="purple">Estado de loading</Badge>
              </Flex>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Criando artes de fundo. Você pode sair desta tela; o rascunho
                fica salvo.
              </Text>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>
    </Grid>
  )
}

function FormatGlyph({ kind }: { kind: 'square' | 'pages' | 'story' }) {
  const back = useColorModeValue('#E8F6FD', 'whiteAlpha.100')
  const front = useColorModeValue('white', 'gray.700')
  const line = useColorModeValue('#093A58', 'gray.300')
  if (kind === 'pages') {
    return (
      <Box
        h="8"
        position="relative"
        w="8"
      >
        <Box
          bg={back}
          borderColor="#7BC9F1"
          borderRadius="sm"
          borderWidth="1px"
          h="6"
          left="2"
          position="absolute"
          top="0"
          w="5"
        />
        <Box
          bg={front}
          borderColor={line}
          borderRadius="sm"
          borderWidth="1px"
          h="6"
          left="0"
          position="absolute"
          top="2"
          w="5"
        />
      </Box>
    )
  }
  return (
    <Box
      bg={back}
      borderColor={line}
      borderRadius="sm"
      borderWidth="1px"
      h={kind === 'story' ? '8' : '6'}
      w={kind === 'story' ? '5' : '6'}
    />
  )
}

