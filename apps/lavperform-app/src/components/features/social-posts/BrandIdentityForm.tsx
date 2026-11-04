import {
  Badge,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  NativeSelect,
  Stack,
  Tabs,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuImagePlus, LuUpload } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import type { SaveBrandPayload } from '@/types'
import { FONT_OPTIONS, TONE_OPTIONS } from '@/types'

import { contrastMessage, readImageFile } from './brandVisual'
import { PostArtwork } from './PostArtwork'

interface Props {
  value: SaveBrandPayload
  saving?: boolean
  onChange: (value: SaveBrandPayload) => void
  onSave: () => void
  onDiscard: () => void
}

const COLOR_FIELDS = [
  ['primaryColor', 'Principal'],
  ['deepColor', 'Profunda'],
  ['accentColor', 'Destaque'],
  ['neutralColor', 'Neutra'],
] as const

export function BrandIdentityForm({
  value,
  saving,
  onChange,
  onSave,
  onDiscard,
}: Props) {
  const [tab, setTab] = useState('visual')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const contrast = contrastMessage(value.primaryColor)
  const previewSlide = {
    backgroundImage: '',
    layers: [
      {
        id: 'band',
        type: 'color-band' as const,
        label: 'Faixa',
        color: value.deepColor,
        opacity: 0.2,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        locked: true,
        visible: true,
      },
      {
        id: 'logo',
        type: 'logo' as const,
        label: 'Logo',
        x: 50,
        y: 8,
        width: 34,
        locked: true,
        visible: true,
        logoVariant: 'light' as const,
      },
      {
        id: 'title',
        type: 'title' as const,
        label: 'Título',
        text: 'Roupa limpa, sem esforço.',
        fontFamily: value.titleFont,
        fontSize: 42,
        color: '#FFFFFF',
        x: 50,
        y: 62,
        width: 84,
        locked: true,
        visible: true,
      },
    ],
  }

  const upload = async (
    file: File | undefined,
    field: 'logoLightUrl' | 'logoDarkUrl'
  ) => {
    if (!file) return
    try {
      const url = await readImageFile(file)
      setUploadError(null)
      onChange({ ...value, [field]: url })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Falha no envio')
    }
  }

  const toggleTone = (tone: string) => {
    const tones = value.tones.includes(tone)
      ? value.tones.filter((item) => item !== tone)
      : [...value.tones, tone]
    onChange({ ...value, tones: tones.length ? tones : [tone] })
  }

  return (
    <Stack gap={4}>
      <Flex
        gap={3}
        justify="flex-end"
        wrap="wrap"
      >
        <Button
          onClick={onDiscard}
          variant="outline"
        >
          Descartar
        </Button>
        <Button
          data-testid="identity-save"
          loading={saving}
          onClick={onSave}
        >
          <LuCheck />
          Salvar identidade
        </Button>
      </Flex>
      <Tabs.Root
        onValueChange={(details) => setTab(details.value)}
        value={tab}
        variant="line"
      >
        <Tabs.List>
          <Tabs.Trigger value="visual">Identidade visual</Tabs.Trigger>
          <Tabs.Trigger value="voice">Tom de voz</Tabs.Trigger>
          <Tabs.Trigger value="references">Exemplos e referências</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      <Grid
        gap={4}
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0, 1.6fr) minmax(280px, 0.8fr)',
        }}
      >
        <Stack gap={4}>
          {tab === 'visual' && (
            <>
              <Card.Root>
                <Card.Body gap={4}>
                  <Stack gap={1}>
                    <Heading size="md">Logo</Heading>
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                    >
                      PNG ou SVG com fundo transparente, mín. 512 px. Usada em
                      todos os posts gerados.
                    </Text>
                  </Stack>
                  <Grid
                    gap={3}
                    templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                  >
                    <LogoSlot
                      label="Fundo claro"
                      onFile={(file) => upload(file, 'logoLightUrl')}
                      src={value.logoLightUrl}
                      testId="logo-light"
                    />
                    <LogoSlot
                      dark
                      label="Fundo escuro"
                      onFile={(file) => upload(file, 'logoDarkUrl')}
                      src={value.logoDarkUrl}
                      testId="logo-dark"
                    />
                    <LabelDrop
                      onFile={(file) =>
                        upload(
                          file,
                          value.logoLightUrl ? 'logoDarkUrl' : 'logoLightUrl'
                        )
                      }
                    />
                  </Grid>
                  {uploadError && (
                    <Text
                      color="fg.error"
                      fontSize="sm"
                    >
                      {uploadError}
                    </Text>
                  )}
                </Card.Body>
              </Card.Root>
              <Card.Root>
                <Card.Body gap={4}>
                  <Stack gap={1}>
                    <Heading size="md">Cores da marca</Heading>
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                    >
                      A IA usa a principal no destaque e as de apoio em fundos e
                      textos.
                    </Text>
                  </Stack>
                  <HStack
                    align="flex-end"
                    gap={4}
                    wrap="wrap"
                  >
                    {COLOR_FIELDS.map(([key, label]) => (
                      <Field.Root key={key}>
                        <Field.Label>{label}</Field.Label>
                        <Input
                          aria-label={label}
                          data-testid={`identity-${key}`}
                          h="12"
                          onChange={(event) =>
                            onChange({ ...value, [key]: event.target.value })
                          }
                          p={1}
                          type="color"
                          value={value[key]}
                          w="16"
                        />
                        <Text
                          color="fg.muted"
                          fontSize="xs"
                        >
                          {value[key]}
                        </Text>
                      </Field.Root>
                    ))}
                  </HStack>
                  <Box
                    bg={contrast.pass ? 'green.50' : 'orange.50'}
                    borderRadius="lg"
                    color={contrast.pass ? 'green.800' : 'orange.800'}
                    px={3}
                    py={2}
                  >
                    <Text fontSize="sm">{contrast.label}</Text>
                  </Box>
                </Card.Body>
              </Card.Root>
              <Card.Root>
                <Card.Body>
                  <Heading
                    mb={3}
                    size="md"
                  >
                    Fontes
                  </Heading>
                  <Grid
                    gap={3}
                    templateColumns={{ base: '1fr', md: '1fr 1fr' }}
                  >
                    <FontSelect
                      label="Títulos"
                      onChange={(titleFont) =>
                        onChange({ ...value, titleFont })
                      }
                      value={value.titleFont}
                    />
                    <FontSelect
                      label="Textos e legendas"
                      onChange={(bodyFont) => onChange({ ...value, bodyFont })}
                      value={value.bodyFont}
                    />
                  </Grid>
                </Card.Body>
              </Card.Root>
            </>
          )}
          {tab === 'voice' && (
            <Card.Root>
              <Card.Body gap={4}>
                <Heading size="md">Tom de voz</Heading>
                <HStack wrap="wrap">
                  {TONE_OPTIONS.map((tone) => {
                    const active = value.tones.includes(tone)
                    return (
                      <Button
                        colorPalette={active ? 'blue' : 'gray'}
                        data-testid={`identity-tone-${tone}`}
                        key={tone}
                        onClick={() => toggleTone(tone)}
                        variant={active ? 'solid' : 'outline'}
                      >
                        {tone}
                      </Button>
                    )
                  })}
                </HStack>
                <Field.Root>
                  <Field.Label>Como a marca fala</Field.Label>
                  <Textarea
                    onChange={(event) =>
                      onChange({ ...value, voiceNotes: event.target.value })
                    }
                    placeholder="Ex.: frases curtas, trata o cliente por você, evita gírias."
                    value={value.voiceNotes ?? ''}
                  />
                </Field.Root>
              </Card.Body>
            </Card.Root>
          )}
          {tab === 'references' && (
            <Card.Root>
              <Card.Body>
                <Field.Root>
                  <Field.Label>Exemplos e referências</Field.Label>
                  <Textarea
                    minH="180px"
                    onChange={(event) =>
                      onChange({ ...value, references: event.target.value })
                    }
                    placeholder="Cole legendas, campanhas ou frases que representam a marca."
                    value={value.references ?? ''}
                  />
                </Field.Root>
              </Card.Body>
            </Card.Root>
          )}
        </Stack>
        <Stack gap={4}>
          <Card.Root>
            <Card.Body gap={3}>
              <Flex justify="space-between">
                <Heading size="sm">Prévia ao vivo</Heading>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Atualiza ao salvar
                </Text>
              </Flex>
              <Box
                bgGradient="to-b"
                borderRadius="xl"
                gradientFrom={value.primaryColor}
                gradientTo={value.deepColor}
                overflow="hidden"
              >
                <PostArtwork
                  brand={value}
                  format="feed"
                  slide={{
                    ...previewSlide,
                    backgroundImage: '',
                    layers: previewSlide.layers.map((layer) =>
                      layer.id === 'band' ? { ...layer, opacity: 0 } : layer
                    ),
                  }}
                />
              </Box>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                É assim que a sua identidade aparece por cima da arte gerada
                pela IA.
              </Text>
              <Button
                asChild
                variant="outline"
              >
                <RouterLink to="/social/generator">
                  Abrir gerador de posts
                </RouterLink>
              </Button>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body gap={3}>
              <Heading size="sm">Tom de voz (resumo)</Heading>
              <HStack wrap="wrap">
                {value.tones.map((tone) => (
                  <Badge
                    colorPalette="blue"
                    key={tone}
                    variant="subtle"
                  >
                    {tone}
                  </Badge>
                ))}
              </HStack>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Configure em detalhes na aba “Tom de voz”.
              </Text>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Grid>
    </Stack>
  )
}

function LogoSlot({
  label,
  src,
  dark,
  onFile,
  testId,
}: {
  label: string
  src: string | null
  dark?: boolean
  onFile: (file: File | undefined) => void
  testId: string
}) {
  return (
    <Field.Root>
      <Box
        as="label"
        bg={dark ? 'gray.900' : 'bg.muted'}
        borderRadius="xl"
        cursor="pointer"
        h="140px"
        overflow="hidden"
        position="relative"
      >
        {src ? (
          <Image
            alt={label}
            h="full"
            objectFit="contain"
            p={4}
            src={src}
            w="full"
          />
        ) : (
          <Flex
            align="center"
            color={dark ? 'white' : 'fg.muted'}
            h="full"
            justify="center"
          >
            <LuImagePlus />
          </Flex>
        )}
        <Input
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          data-testid={testId}
          display="none"
          onChange={(event) => onFile(event.target.files?.[0])}
          type="file"
        />
      </Box>
      <Text
        fontSize="sm"
        textAlign="center"
      >
        {label}
      </Text>
    </Field.Root>
  )
}

function LabelDrop({ onFile }: { onFile: (file: File | undefined) => void }) {
  return (
    <Box
      as="label"
      border="1px dashed"
      borderColor="border"
      borderRadius="xl"
      cursor="pointer"
      h="140px"
    >
      <Flex
        align="center"
        color="fg.muted"
        direction="column"
        gap={2}
        h="full"
        justify="center"
      >
        <LuUpload />
        <Text fontSize="sm">Arraste ou envie</Text>
      </Flex>
      <Input
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        display="none"
        onChange={(event) => onFile(event.target.files?.[0])}
        type="file"
      />
    </Box>
  )
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Field
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {FONT_OPTIONS.map((font) => (
            <option
              key={font}
              value={font}
            >
              {font}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </Field.Root>
  )
}
