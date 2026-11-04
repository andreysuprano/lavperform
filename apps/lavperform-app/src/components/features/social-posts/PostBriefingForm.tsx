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
import { useEffect } from 'react'
import { LuSparkles } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import type { BrandIdentity, CreateDraftPayload } from '@/types'
import { ART_STYLES, POST_OBJECTIVES } from '@/types'

interface Props {
  value: CreateDraftPayload
  brand?: BrandIdentity
  generating?: boolean
  notice?: string | null
  error?: string | null
  onChange: (value: CreateDraftPayload) => void
  onGenerate: () => void
}

export function PostBriefingForm({
  value,
  brand,
  generating,
  notice,
  error,
  onChange,
  onGenerate,
}: Props) {
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
                    borderRadius="full"
                    colorPalette={active ? 'blue' : 'gray'}
                    key={objective.value}
                    onClick={() =>
                      onChange({ ...value, objective: objective.value })
                    }
                    size="sm"
                    variant={active ? 'solid' : 'outline'}
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
          <Field.Root>
            <Field.Label>Formato</Field.Label>
            <HStack>
              {(
                [
                  ['feed', 'Feed', '1 / 1'],
                  ['story', 'Story', '9 / 16'],
                  ['carousel', 'Carrossel', '4 / 5'],
                ] as const
              ).map(([format, label, ratio]) => (
                <Button
                  borderColor={value.format === format ? 'blue.400' : 'border'}
                  borderWidth="2px"
                  h="auto"
                  key={format}
                  onClick={() =>
                    onChange({
                      ...value,
                      format,
                      slideCount:
                        format === 'carousel' ? value.slideCount || 4 : 1,
                    })
                  }
                  py={3}
                  variant="outline"
                >
                  <Stack gap={2}>
                    <Box
                      aspectRatio={ratio}
                      bg="bg.muted"
                      borderRadius="md"
                      w="14"
                    />
                    <Text fontSize="sm">{label}</Text>
                  </Stack>
                </Button>
              ))}
            </HStack>
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
                  {[2, 3, 4, 5, 6].map((count) => (
                    <option
                      key={count}
                      value={count}
                    >
                      {count} slides
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
          <Flex
            align="center"
            justify="space-between"
            wrap="wrap"
          >
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Ctrl + Enter para gerar
            </Text>
            <Button
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
        <Card.Root>
          <Card.Body gap={3}>
            <Flex justify="space-between">
              <Heading size="sm">Identidade aplicada</Heading>
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
                brand?.primaryColor,
                brand?.deepColor,
                brand?.accentColor,
                brand?.neutralColor,
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
              {brand?.titleFont || 'Poppins'} / {brand?.bodyFont || 'Inter'} ·{' '}
              {(brand?.tones || ['Próximo']).join(' e ')}
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap={2}>
            <Heading size="sm">Como a IA monta o post</Heading>
            <Text fontSize="sm">A IA cria só a arte de fundo.</Text>
            <Text fontSize="sm">
              LavPerform coloca por cima o texto, logo e cores da sua marca.
            </Text>
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
          </Card.Body>
        </Card.Root>
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
