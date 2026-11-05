import {
  Badge,
  Box,
  Button,
  Card,
  createListCollection,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Portal,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuImagePlus, LuUpload } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import { useColorModeValue } from '@/components/ui/color-mode'
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
  const [titleWeight, setTitleWeight] = useState('ExtraBold')
  const [bodyWeight, setBodyWeight] = useState('Regular')
  const [extraColors, setExtraColors] = useState<string[]>([])
  const contrast = contrastMessage(value.primaryColor)
  const contrastBg = useColorModeValue(
    contrast.pass ? 'green.50' : 'orange.50',
    contrast.pass ? 'green.50' : 'orange.900/20',
  )
  const contrastColor = useColorModeValue(
    contrast.pass ? 'green.800' : 'orange.800',
    contrast.pass ? 'green.800' : 'orange.200',
  )
  const contrastBorder = useColorModeValue(
    'transparent',
    contrast.pass ? 'transparent' : 'orange.700',
  )
  const previewSlide = {
    backgroundImage: '/samples/post-background.svg',
    layers: [
      {
        id: 'band',
        type: 'color-band' as const,
        label: 'Faixa',
        color: value.deepColor,
        opacity: 1,
        x: 0,
        y: 42,
        width: 100,
        height: 58,
        locked: true,
        visible: true,
      },
      {
        id: 'logo',
        type: 'logo' as const,
        label: 'Logo',
        x: 94,
        y: 4,
        width: 36,
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
        fontSize: titleWeight === 'ExtraBold' ? 56 : 48,
        color: '#FFFFFF',
        x: 6,
        y: 64,
        width: 88,
        locked: true,
        visible: true,
      },
      {
        id: 'badge',
        type: 'badge' as const,
        label: 'Selo',
        text: '20% OFF · toda sexta',
        fontFamily: value.bodyFont,
        fontSize: bodyWeight === 'Regular' ? 18 : 20,
        color: value.deepColor,
        backgroundColor: value.accentColor,
        x: 6,
        y: 84,
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
          bg="#7BC9F1"
          color="#093A58"
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
                      contrast={!value.logoDarkUrl && Boolean(value.logoLightUrl)}
                      label="Fundo claro"
                      onFile={(file) => upload(file, 'logoLightUrl')}
                      src={value.logoDarkUrl || value.logoLightUrl}
                      testId="logo-light"
                    />
                    <LogoSlot
                      dark
                      label="Fundo escuro"
                      onFile={(file) => upload(file, 'logoDarkUrl')}
                      src={value.logoLightUrl || value.logoDarkUrl}
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
                      <Field.Root
                        key={key}
                        w="auto"
                      >
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
                    {extraColors.map((color, index) => (
                      <Field.Root
                        key={`extra-${index}`}
                        w="auto"
                      >
                        <Field.Label>Extra</Field.Label>
                        <Input
                          aria-label={`Cor extra ${index + 1}`}
                          h="12"
                          onChange={(event) =>
                            setExtraColors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item
                              )
                            )
                          }
                          p={1}
                          type="color"
                          value={color}
                          w="16"
                        />
                      </Field.Root>
                    ))}
                    <Button
                      alignSelf="flex-end"
                      onClick={() =>
                        setExtraColors((current) => [...current, '#7BC9F1'])
                      }
                      size="sm"
                      variant="outline"
                    >
                      + Adicionar
                    </Button>
                  </HStack>
                  <Box
                    bg={contrastBg}
                    borderColor={contrastBorder}
                    borderRadius="lg"
                    borderWidth="1px"
                    color={contrastColor}
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
                    <HStack align="flex-end">
                      <FontSelect
                        label="Títulos"
                        onChange={(titleFont) =>
                          onChange({ ...value, titleFont })
                        }
                        value={value.titleFont}
                      />
                      <WeightSelect
                        label="Peso"
                        onChange={setTitleWeight}
                        value={titleWeight}
                      />
                    </HStack>
                    <HStack align="flex-end">
                      <FontSelect
                        label="Textos e legendas"
                        onChange={(bodyFont) =>
                          onChange({ ...value, bodyFont })
                        }
                        value={value.bodyFont}
                      />
                      <WeightSelect
                        label="Peso"
                        onChange={setBodyWeight}
                        value={bodyWeight}
                      />
                    </HStack>
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
                        bg={active ? '#E6F5FD' : 'white'}
                        borderColor={active ? '#7BC9F1' : '#E4E7EB'}
                        color="#093A58"
                        data-testid={`identity-tone-${tone}`}
                        key={tone}
                        onClick={() => toggleTone(tone)}
                        variant="outline"
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
  contrast,
  onFile,
  testId,
}: {
  label: string
  src: string | null
  dark?: boolean
  contrast?: boolean
  onFile: (file: File | undefined) => void
  testId: string
}) {
  return (
    <Field.Root>
      <Box
        as="label"
        bg={dark ? 'gray.800' : 'gray.50'}
        border="1px dashed"
        borderColor={dark ? 'gray.600' : 'gray.200'}
        borderRadius="xl"
        cursor="pointer"
        h="140px"
        overflow="hidden"
        position="relative"
        w="full"
      >
        {src ? (
          <Image
            alt={label}
            filter={contrast ? 'brightness(0)' : undefined}
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

function OptionSelect({
  label,
  value,
  options,
  onChange,
  minW,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  minW?: string
}) {
  const collection = createListCollection({
    items: options.map((option) => ({ label: option, value: option })),
  })
  return (
    <Field.Root minW={minW}>
      <Select.Root
        collection={collection}
        onValueChange={(details) => {
          const next = details.value[0]
          if (next) onChange(next)
        }}
        value={[value]}
      >
        <Select.HiddenSelect />
        <Select.Label>{label}</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={label} />
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Trigger>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {collection.items.map((item) => (
                <Select.Item
                  item={item}
                  key={item.value}
                >
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Field.Root>
  )
}

function WeightSelect(props: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <OptionSelect
      {...props}
      minW="40"
      options={['Regular', 'Medium', 'Bold', 'ExtraBold']}
    />
  )
}

function FontSelect(props: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <OptionSelect
      {...props}
      options={[...FONT_OPTIONS]}
    />
  )
}
