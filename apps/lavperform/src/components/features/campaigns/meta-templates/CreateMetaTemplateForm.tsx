import {
  Badge,
  Box,
  Button,
  Field,
  FileUpload,
  Flex,
  Grid,
  HStack,
  Icon,
  Image,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
  createListCollection,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { LuPlus, LuTrash2, LuUpload } from 'react-icons/lu'

import { FileUploadList, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { uploadFileWithBase64 } from '@/firebase/storage'
import { useCreateMetaTemplate } from '@/hooks/queries'
import type {
  CreateMetaTemplateButton,
  MetaTemplateButtonType,
  MetaTemplateComponent,
  MetaTemplateFormValues,
} from '@/types/metaTemplate.types'

import { MetaTemplatePreview } from './MetaTemplatePreview'
import {
  buildCreatePayload,
  buildDefaultFormValues,
  countTemplateVariables,
  getTemplateDisplayLabel,
  META_TEMPLATE_CATEGORY_LABELS,
  previewMetaTemplateName,
} from './metaTemplate.utils'

const BUTTON_TYPE_LABELS: Record<MetaTemplateButtonType, string> = {
  QUICK_REPLY: 'Resposta rápida',
  URL: 'Link',
  PHONE_NUMBER: 'Telefone',
}

const categoryOptions = createListCollection({
  items: Object.entries(META_TEMPLATE_CATEGORY_LABELS).map(([value, label]) => ({
    label,
    value,
  })),
})

const headerFormatOptions = createListCollection({
  items: [
    { label: 'Texto', value: 'TEXT' },
    { label: 'Imagem', value: 'IMAGE' },
    { label: 'Vídeo', value: 'VIDEO' },
    { label: 'Documento', value: 'DOCUMENT' },
  ],
})

function createEmptyButton(type: MetaTemplateButtonType): CreateMetaTemplateButton {
  return {
    type,
    text: '',
    url: type === 'URL' ? 'https://' : undefined,
    urlExample: type === 'URL' ? '' : undefined,
    phoneNumber: type === 'PHONE_NUMBER' ? '+55' : undefined,
  }
}

export function CreateMetaTemplateForm({ onSuccess }: { onSuccess?: () => void }) {
  const { selectedCompany } = useAuth()
  const createMutation = useCreateMetaTemplate(selectedCompany?.id)
  const [values, setValues] = useState<MetaTemplateFormValues>(buildDefaultFormValues)
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null)

  const variableCount = useMemo(
    () => countTemplateVariables(values.bodyText),
    [values.bodyText]
  )

  const previewHeaderMediaUrl = useMemo(() => {
    if (!values.headerEnabled) return null
    if (values.headerFormat === 'IMAGE' || values.headerFormat === 'VIDEO') {
      return headerPreviewUrl ?? values.headerImageUrl
    }
    return null
  }, [
    headerPreviewUrl,
    values.headerEnabled,
    values.headerFormat,
    values.headerImageUrl,
  ])

  const previewHeaderFormat = useMemo(() => {
    if (!values.headerEnabled) return null
    if (values.headerFormat === 'TEXT' && !values.headerText.trim()) return null
    return values.headerFormat
  }, [values.headerEnabled, values.headerFormat, values.headerText])

  const previewHeaderText = useMemo(
    () => (values.headerFormat === 'TEXT' ? values.headerText : null),
    [values.headerFormat, values.headerText]
  )

  const previewBodyText = values.bodyText
  const previewFooterText = values.footerText
  const previewButtons = values.buttons

  const previewComponents = useMemo((): MetaTemplateComponent[] => {
    const components: MetaTemplateComponent[] = []

    if (previewHeaderFormat) {
      if (previewHeaderFormat === 'TEXT') {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: previewHeaderText ?? '',
        })
      } else {
        components.push({
          type: 'HEADER',
          format: previewHeaderFormat,
        })
      }
    }

    if (previewBodyText.trim()) {
      components.push({ type: 'BODY', text: previewBodyText })
    }

    if (previewFooterText.trim()) {
      components.push({ type: 'FOOTER', text: previewFooterText })
    }

    if (previewButtons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: previewButtons.map((button) => ({
          type: button.type,
          text: button.text,
        })),
      })
    }

    return components
  }, [
    previewBodyText,
    previewButtons,
    previewFooterText,
    previewHeaderFormat,
    previewHeaderText,
  ])

  const updateField = useCallback(
    <K extends keyof MetaTemplateFormValues>(
      key: K,
      value: MetaTemplateFormValues[K]
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleHeaderImage = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setHeaderPreviewUrl(base64)
      updateField('headerImageBase64', base64)
      updateField('headerImageUrl', null)
    }
    reader.readAsDataURL(file)
  }, [updateField])

  const handleAddButton = useCallback((type: MetaTemplateButtonType) => {
    if (values.buttons.length >= 3) return
    setValues((prev) => ({
      ...prev,
      buttons: [...prev.buttons, createEmptyButton(type)],
    }))
  }, [values.buttons.length])

  const handleRemoveButton = useCallback((index: number) => {
    setValues((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!selectedCompany?.id) return

    if (!values.displayName.trim()) {
      toaster.create({
        type: 'error',
        title: 'Nome obrigatório',
        description: 'Informe um nome amigável para identificar o template.',
      })
      return
    }

    if (!values.bodyText.trim()) {
      toaster.create({
        type: 'error',
        title: 'Corpo obrigatório',
        description: 'O texto do corpo do template é obrigatório.',
      })
      return
    }

    if (
      values.headerEnabled &&
      values.headerFormat === 'TEXT' &&
      !values.headerText.trim()
    ) {
      toaster.create({
        type: 'error',
        title: 'Header incompleto',
        description: 'Informe o texto do header ou desative o header.',
      })
      return
    }

    if (
      values.headerEnabled &&
      values.headerFormat !== 'TEXT' &&
      !values.headerImageBase64 &&
      !values.headerImageUrl
    ) {
      toaster.create({
        type: 'error',
        title: 'Mídia do header',
        description: 'Faça upload da imagem, vídeo ou documento do header.',
      })
      return
    }

    try {
      let headerMediaUrl = values.headerImageUrl
      if (values.headerImageBase64) {
        headerMediaUrl = await uploadFileWithBase64(
          values.headerImageBase64,
          'meta-templates'
        )
      }

      const payload = buildCreatePayload(values, headerMediaUrl)

      const created = await createMutation.mutateAsync(payload)

      toaster.create({
        type: created.status === 'ERROR' ? 'warning' : 'success',
        title:
          created.status === 'ERROR'
            ? 'Template criado com erro'
            : 'Template enviado para análise',
        description:
          created.status === 'ERROR'
            ? created.rejectedReason || 'Verifique os dados e tente novamente.'
            : 'A Meta vai revisar o template. Você pode acompanhar o status na listagem.',
      })

      setValues(buildDefaultFormValues())
      setHeaderPreviewUrl(null)
      onSuccess?.()
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error as { message?: string })?.message ||
        'Não foi possível criar o template.'

      toaster.create({
        type: 'error',
        title: 'Erro ao criar template',
        description: message,
      })
    }
  }, [createMutation, onSuccess, selectedCompany?.id, values])

  return (
    <Grid
      gap={6}
      templateColumns={{ base: '1fr', xl: '1.4fr 0.8fr' }}
    >
      <Stack gap={5}>
        <Box>
          <Text
            fontSize="lg"
            fontWeight="semibold"
          >
            Novo template
          </Text>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Crie um template para a API oficial do WhatsApp. Após aprovação, ele
            poderá ser vinculado às campanhas.
          </Text>
        </Box>

        <Stack gap={4}>
          <Grid
            gap={4}
            templateColumns={{ base: '1fr', md: '1fr 1fr' }}
          >
            <Field.Root required>
              <Field.Label>Nome amigável</Field.Label>
              <Input
                maxLength={120}
                onChange={(e) => updateField('displayName', e.target.value)}
                placeholder="Promoção Verão 2026"
                value={values.displayName}
              />
              <Field.HelperText>
                Nome para você identificar o template. O identificador enviado à
                Meta será gerado automaticamente
                {values.displayName.trim()
                  ? `: ${previewMetaTemplateName(values.displayName)}`
                  : '.'}
              </Field.HelperText>
            </Field.Root>

            <Field.Root required>
              <Field.Label>Categoria</Field.Label>
              <Select.Root
                collection={categoryOptions}
                onValueChange={(details) =>
                  updateField(
                    'category',
                    details.value[0] as MetaTemplateFormValues['category']
                  )
                }
                value={[values.category]}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Selecione a categoria" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {categoryOptions.items.map((item) => (
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
              </Select.Root>
            </Field.Root>
          </Grid>

          <Box
            borderColor="border"
            borderRadius="lg"
            borderWidth="1px"
            p={4}
          >
            <Flex
              align="center"
              justify="space-between"
              mb={3}
            >
              <Text fontWeight="medium">Header</Text>
              <Button
                onClick={() => updateField('headerEnabled', !values.headerEnabled)}
                size="xs"
                variant={values.headerEnabled ? 'solid' : 'outline'}
              >
                {values.headerEnabled ? 'Ativo' : 'Desativado'}
              </Button>
            </Flex>

            {values.headerEnabled && (
              <Stack gap={3}>
                <Field.Root>
                  <Field.Label>Tipo</Field.Label>
                  <Select.Root
                    collection={headerFormatOptions}
                    onValueChange={(details) =>
                      updateField(
                        'headerFormat',
                        details.value[0] as MetaTemplateFormValues['headerFormat']
                      )
                    }
                    value={[values.headerFormat]}
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Tipo do header" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {headerFormatOptions.items.map((item) => (
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
                  </Select.Root>
                </Field.Root>

                {values.headerFormat === 'TEXT' ? (
                  <>
                    <Field.Root>
                      <Field.Label>Texto do header</Field.Label>
                      <Input
                        maxLength={60}
                        onChange={(e) => updateField('headerText', e.target.value)}
                        placeholder="Promoção especial {{1}}"
                        value={values.headerText}
                      />
                    </Field.Root>
                    {values.headerText.includes('{{1}}') && (
                      <Field.Root>
                        <Field.Label>Exemplo da variável</Field.Label>
                        <Input
                          onChange={(e) =>
                            updateField('headerExample', e.target.value)
                          }
                          placeholder="Verão 2026"
                          value={values.headerExample}
                        />
                      </Field.Root>
                    )}
                  </>
                ) : (
                  <Field.Root>
                    <Field.Label>Arquivo do header</Field.Label>
                    <FileUpload.Root
                      accept={
                        values.headerFormat === 'IMAGE'
                          ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }
                          : values.headerFormat === 'VIDEO'
                            ? { 'video/*': ['.mp4'] }
                            : { 'application/pdf': ['.pdf'] }
                      }
                      maxFiles={1}
                      onFileChange={(details) => {
                        void handleHeaderImage(details.acceptedFiles)
                      }}
                    >
                      <FileUpload.HiddenInput />
                      <FileUpload.Trigger asChild>
                        <Button variant="outline">
                          <Icon as={LuUpload} />
                          Enviar arquivo
                        </Button>
                      </FileUpload.Trigger>
                      <FileUploadList />
                    </FileUpload.Root>
                    {headerPreviewUrl && values.headerFormat === 'IMAGE' && (
                      <Image
                        alt="Preview header"
                        borderRadius="md"
                        maxH="180px"
                        mt={2}
                        objectFit="cover"
                        src={headerPreviewUrl}
                      />
                    )}
                  </Field.Root>
                )}
              </Stack>
            )}
          </Box>

          <Field.Root required>
            <Field.Label>Corpo da mensagem</Field.Label>
            <Textarea
              maxLength={1024}
              minH="120px"
              onChange={(e) => updateField('bodyText', e.target.value)}
              placeholder="Olá {{1}}, temos uma oferta especial para você!"
              value={values.bodyText}
            />
            <Field.HelperText>
              Use {'{{1}}'}, {'{{2}}'} para variáveis dinâmicas.
              {variableCount > 0 && ` ${variableCount} variável(is) detectada(s).`}
            </Field.HelperText>
          </Field.Root>

          {variableCount > 0 && (
            <Stack gap={2}>
              <Text
                fontSize="sm"
                fontWeight="medium"
              >
                Exemplos das variáveis
              </Text>
              {Array.from({ length: variableCount }).map((_, index) => (
                <Field.Root key={index}>
                  <Field.Label>{`Exemplo {{${index + 1}}}`}</Field.Label>
                  <Input
                    onChange={(e) => {
                      const next = [...values.bodyExamples]
                      next[index] = e.target.value
                      updateField('bodyExamples', next)
                    }}
                    placeholder={index === 0 ? 'João' : `Valor ${index + 1}`}
                    value={values.bodyExamples[index] ?? ''}
                  />
                </Field.Root>
              ))}
            </Stack>
          )}

          <Field.Root>
            <Field.Label>Rodapé (opcional)</Field.Label>
            <Input
              maxLength={60}
              onChange={(e) => updateField('footerText', e.target.value)}
              placeholder="Responda SAIR para não receber promoções"
              value={values.footerText}
            />
          </Field.Root>

          <Box
            borderColor="border"
            borderRadius="lg"
            borderWidth="1px"
            p={4}
          >
            <Flex
              align="center"
              justify="space-between"
              mb={3}
            >
              <Text fontWeight="medium">Botões</Text>
              <HStack gap={2}>
                <Button
                  disabled={values.buttons.length >= 3}
                  onClick={() => handleAddButton('QUICK_REPLY')}
                  size="xs"
                  variant="outline"
                >
                  <Icon as={LuPlus} />
                  Resposta
                </Button>
                <Button
                  disabled={values.buttons.length >= 3}
                  onClick={() => handleAddButton('URL')}
                  size="xs"
                  variant="outline"
                >
                  <Icon as={LuPlus} />
                  Link
                </Button>
                <Button
                  disabled={values.buttons.length >= 3}
                  onClick={() => handleAddButton('PHONE_NUMBER')}
                  size="xs"
                  variant="outline"
                >
                  <Icon as={LuPlus} />
                  Telefone
                </Button>
              </HStack>
            </Flex>

            {values.buttons.length === 0 ? (
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Até 3 botões: resposta rápida, link ou telefone.
              </Text>
            ) : (
              <Stack gap={3}>
                {values.buttons.map((button, index) => (
                  <Box
                    key={index}
                    bg="bg.subtle"
                    borderRadius="md"
                    p={3}
                  >
                    <Flex
                      align="center"
                      justify="space-between"
                      mb={2}
                    >
                      <Badge variant="subtle">
                        {BUTTON_TYPE_LABELS[button.type]}
                      </Badge>
                      <Button
                        onClick={() => handleRemoveButton(index)}
                        size="xs"
                        variant="ghost"
                      >
                        <Icon as={LuTrash2} />
                      </Button>
                    </Flex>
                    <Stack gap={2}>
                      <Field.Root required>
                        <Field.Label>Texto do botão</Field.Label>
                        <Input
                          maxLength={25}
                          onChange={(e) => {
                            const next = [...values.buttons]
                            next[index] = { ...next[index], text: e.target.value }
                            updateField('buttons', next)
                          }}
                          value={button.text}
                        />
                      </Field.Root>
                      {button.type === 'URL' && (
                        <>
                          <Field.Root required>
                            <Field.Label>URL</Field.Label>
                            <Input
                              onChange={(e) => {
                                const next = [...values.buttons]
                                next[index] = { ...next[index], url: e.target.value }
                                updateField('buttons', next)
                              }}
                              placeholder="https://seusite.com/pedido/{{1}}"
                              value={button.url ?? ''}
                            />
                          </Field.Root>
                          {button.url?.includes('{{1}}') && (
                            <Field.Root>
                              <Field.Label>Exemplo do sufixo</Field.Label>
                              <Input
                                onChange={(e) => {
                                  const next = [...values.buttons]
                                  next[index] = {
                                    ...next[index],
                                    urlExample: e.target.value,
                                  }
                                  updateField('buttons', next)
                                }}
                                placeholder="12345"
                                value={button.urlExample ?? ''}
                              />
                            </Field.Root>
                          )}
                        </>
                      )}
                      {button.type === 'PHONE_NUMBER' && (
                        <Field.Root required>
                          <Field.Label>Telefone</Field.Label>
                          <Input
                            onChange={(e) => {
                              const next = [...values.buttons]
                              next[index] = {
                                ...next[index],
                                phoneNumber: e.target.value,
                              }
                              updateField('buttons', next)
                            }}
                            placeholder="+5541999999999"
                            value={button.phoneNumber ?? ''}
                          />
                        </Field.Root>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Flex justify="flex-end">
            <Button
              loading={createMutation.isPending}
              onClick={() => void handleSubmit()}
            >
              Enviar para análise da Meta
            </Button>
          </Flex>
        </Stack>
      </Stack>

      <Box
        alignSelf={{ xl: 'start' }}
        position={{ xl: 'sticky' }}
        top={4}
      >
        <MetaTemplatePreview
          components={previewComponents}
          headerMediaUrl={previewHeaderMediaUrl}
          name={getTemplateDisplayLabel({
            displayName: values.displayName,
            name: previewMetaTemplateName(values.displayName),
          })}
        />
      </Box>
    </Grid>
  )
}
