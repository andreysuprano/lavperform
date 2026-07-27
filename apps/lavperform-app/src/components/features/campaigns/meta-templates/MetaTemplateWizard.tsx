import {
  Alert,
  Badge,
  Box,
  Button,
  createListCollection,
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
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuClock,
  LuPlus,
  LuTrash2,
  LuUpload,
} from 'react-icons/lu'

import { Empty, FileUploadList, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { uploadFileWithBase64 } from '@/firebase/storage'
import { useCreateMetaTemplate, useUpdateMetaTemplate } from '@/hooks/queries'
import type {
  CreateMetaTemplateButton,
  MetaMessageTemplate,
  MetaTemplateButtonType,
  MetaTemplateComponent,
  MetaTemplateFormValues,
} from '@/types/metaTemplate.types'

import {
  buildCreatePayload,
  buildDefaultFormValues,
  buildFormValuesFromTemplate,
  canEditMetaTemplateCategory,
  countTemplateVariables,
  formatMetaTemplateError,
  getTemplateDisplayLabel,
  META_TEMPLATE_CATEGORY_LABELS,
  previewMetaTemplateName,
  sanitizeFooterText,
} from './metaTemplate.utils'
import { MetaTemplatePreview } from './MetaTemplatePreview'

type MetaTemplateWizardProps = {
  onCancel?: () => void
  onSuccess?: () => void
  template?: MetaMessageTemplate
}

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

const mediaFormatOptions = createListCollection({
  items: [
    { label: 'Imagem', value: 'IMAGE' },
    { label: 'Vídeo', value: 'VIDEO' },
    { label: 'Documento', value: 'DOCUMENT' },
    { label: 'Texto (título)', value: 'TEXT' },
  ],
})

const STEP_LABELS = [
  'Identificação',
  'Mídia',
  'Mensagem',
  'Rodapé e botões',
  'Revisão',
]

function createEmptyButton(type: MetaTemplateButtonType): CreateMetaTemplateButton {
  return {
    type,
    text: '',
    url: type === 'URL' ? 'https://' : undefined,
    urlExample: type === 'URL' ? '' : undefined,
    phoneNumber: type === 'PHONE_NUMBER' ? '+55' : undefined,
  }
}

export function MetaTemplateWizard({
  onCancel,
  onSuccess,
  template,
}: MetaTemplateWizardProps) {
  const isEditMode = !!template
  const { selectedCompany } = useAuth()
  const createMutation = useCreateMetaTemplate(selectedCompany?.id)
  const updateMutation = useUpdateMetaTemplate(selectedCompany?.id)

  const [step, setStep] = useState(0)
  const [values, setValues] = useState<MetaTemplateFormValues>(() =>
    template ? buildFormValuesFromTemplate(template) : buildDefaultFormValues()
  )
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const isSubmitting =
    isProcessing || createMutation.isPending || updateMutation.isPending

  const canEditCategory =
    !isEditMode ||
    (template ? canEditMetaTemplateCategory(template.status) : false)

  const variableCount = useMemo(
    () => countTemplateVariables(values.bodyText),
    [values.bodyText]
  )

  const updateField = useCallback(
    <K extends keyof MetaTemplateFormValues>(
      key: K,
      value: MetaTemplateFormValues[K]
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }))
    },
    []
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

  const previewComponents = useMemo((): MetaTemplateComponent[] => {
    const components: MetaTemplateComponent[] = []

    if (values.headerEnabled) {
      if (values.headerFormat === 'TEXT') {
        if (values.headerText.trim()) {
          components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: values.headerText,
          })
        }
      } else {
        components.push({ type: 'HEADER', format: values.headerFormat })
      }
    }

    if (values.bodyText.trim()) {
      components.push({ type: 'BODY', text: values.bodyText })
    }

    if (values.footerText.trim()) {
      components.push({ type: 'FOOTER', text: values.footerText })
    }

    if (values.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: values.buttons.map((button) => ({
          type: button.type,
          text: button.text,
        })),
      })
    }

    return components
  }, [
    values.bodyText,
    values.buttons,
    values.footerText,
    values.headerEnabled,
    values.headerFormat,
    values.headerText,
  ])

  const handleHeaderImage = useCallback(
    async (files: File[]) => {
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
    },
    [updateField]
  )

  const handleToggleMedia = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        updateField('headerEnabled', true)
      } else {
        setValues((prev) => ({
          ...prev,
          headerEnabled: false,
          headerText: '',
          headerExample: '',
          headerImageBase64: null,
          headerImageUrl: null,
        }))
        setHeaderPreviewUrl(null)
      }
    },
    [updateField]
  )

  const handleAddButton = useCallback(
    (type: MetaTemplateButtonType) => {
      if (values.buttons.length >= 3) return
      setValues((prev) => ({
        ...prev,
        buttons: [...prev.buttons, createEmptyButton(type)],
      }))
    },
    [values.buttons.length]
  )

  const handleRemoveButton = useCallback((index: number) => {
    setValues((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }))
  }, [])

  const validateStep = useCallback(
    (target: number): string | null => {
      if (target === 0) {
        if (!values.displayName.trim()) {
          return 'Informe um nome amigável para identificar o template.'
        }
      }

      if (target === 1 && values.headerEnabled) {
        if (values.headerFormat === 'TEXT' && !values.headerText.trim()) {
          return 'Informe o texto do título ou desative a mídia.'
        }
        if (
          values.headerFormat !== 'TEXT' &&
          !values.headerImageBase64 &&
          !values.headerImageUrl
        ) {
          return 'Faça o upload da imagem, vídeo ou documento.'
        }
      }

      if (target === 2) {
        if (!values.bodyText.trim()) {
          return 'O texto da mensagem é obrigatório.'
        }
      }

      if (target === 3) {
        for (const button of values.buttons) {
          if (!button.text.trim()) {
            return 'Preencha o texto de todos os botões.'
          }
          if (button.type === 'URL' && !button.url?.trim()) {
            return 'Informe o link dos botões do tipo link.'
          }
          if (button.type === 'PHONE_NUMBER' && !button.phoneNumber?.trim()) {
            return 'Informe o telefone dos botões do tipo telefone.'
          }
        }
      }

      return null
    },
    [values]
  )

  const handleNext = useCallback(() => {
    const error = validateStep(step)
    if (error) {
      toaster.create({
        type: 'error',
        title: 'Verifique os dados',
        description: error,
      })
      return
    }
    setStep((prev) => Math.min(prev + 1, STEP_LABELS.length - 1))
  }, [step, validateStep])

  const handleBack = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!selectedCompany?.id) return

    setIsProcessing(true)

    for (let i = 0; i < STEP_LABELS.length; i++) {
      const error = validateStep(i)
      if (error) {
        setStep(i)
        setIsProcessing(false)
        toaster.create({
          type: 'error',
          title: 'Verifique os dados',
          description: error,
        })
        return
      }
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

      const result =
        isEditMode && template
          ? await updateMutation.mutateAsync({
              templateId: template.id,
              payload,
            })
          : await createMutation.mutateAsync(payload)

      if (result.status === 'ERROR') {
        toaster.create({
          type: 'warning',
          title: isEditMode
            ? 'Template atualizado com erro'
            : 'Template criado com erro',
          description:
            formatMetaTemplateError(result.rejectedReason)?.message ||
            'Verifique os dados e tente novamente.',
        })
      } else {
        toaster.create({
          type: 'success',
          title: isEditMode
            ? 'Template reenviado para análise'
            : 'Template enviado para análise',
          description:
            'A Meta vai revisar o template. Acompanhe o status na listagem.',
        })
        setSubmitted(true)
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error as { message?: string })?.message ||
        (isEditMode
          ? 'Não foi possível atualizar o template.'
          : 'Não foi possível criar o template.')

      toaster.create({
        type: 'error',
        title: isEditMode ? 'Erro ao editar template' : 'Erro ao criar template',
        description: message,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [
    createMutation,
    isEditMode,
    selectedCompany?.id,
    template,
    updateMutation,
    validateStep,
    values,
  ])

  const previewName = isEditMode
    ? getTemplateDisplayLabel(template!)
    : getTemplateDisplayLabel({
        displayName: values.displayName,
        name: previewMetaTemplateName(values.displayName),
      })

  const isLastStep = step === STEP_LABELS.length - 1

  if (submitted) {
    return (
      <Stack
        gap={6}
        py={4}
      >
        <Empty
          description="Seu template foi enviado e está em análise pela Meta. Assim que for aprovado, ele estará disponível para uso nas suas campanhas."
          icon={LuClock}
          title="Template em análise pela Meta"
        />
        <Flex justify="center">
          <Button onClick={() => onSuccess?.()}>Concluir</Button>
        </Flex>
      </Stack>
    )
  }

  return (
    <Stack gap={6}>
      <StepIndicator current={step} />

      {isEditMode && (
        <Alert.Root
          borderRadius="md"
          status="info"
          variant="surface"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Alterações passam por nova análise</Alert.Title>
            <Alert.Description>
              Nome e idioma não podem ser alterados após a criação na Meta.
              {canEditCategory
                ? ' A categoria pode ser ajustada neste status.'
                : ' A categoria só pode ser alterada em templates rejeitados ou pausados.'}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <Box minH="280px">
        {step === 0 && (
          <StepIdentification
            canEditCategory={canEditCategory}
            isEditMode={isEditMode}
            technicalName={template?.name}
            updateField={updateField}
            values={values}
          />
        )}

        {step === 1 && (
          <StepMedia
            headerPreviewUrl={headerPreviewUrl}
            onToggleMedia={handleToggleMedia}
            onUpload={handleHeaderImage}
            updateField={updateField}
            values={values}
          />
        )}

        {step === 2 && (
          <StepMessage
            updateField={updateField}
            values={values}
            variableCount={variableCount}
          />
        )}

        {step === 3 && (
          <StepFooterButtons
            onAddButton={handleAddButton}
            onRemoveButton={handleRemoveButton}
            updateField={updateField}
            values={values}
          />
        )}

        {step === 4 && (
          <Stack gap={3}>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Confira como sua mensagem será exibida no WhatsApp antes de enviar
              para análise da Meta.
            </Text>
            <Flex justify="center">
              <MetaTemplatePreview
                components={previewComponents}
                headerMediaUrl={previewHeaderMediaUrl}
                name={previewName}
              />
            </Flex>
          </Stack>
        )}
      </Box>

      <Flex
        align="center"
        gap={2}
        justify="space-between"
      >
        <Button
          onClick={onCancel}
          variant="ghost"
        >
          Cancelar
        </Button>

        <HStack gap={2}>
          {step > 0 && (
            <Button
              onClick={handleBack}
              variant="outline"
            >
              <Icon as={LuArrowLeft} />
              Voltar
            </Button>
          )}

          {isLastStep ? (
            <Button
              loading={isSubmitting}
              onClick={() => void handleSubmit()}
            >
              <Icon as={LuCheck} />
              {isEditMode
                ? 'Salvar e reenviar para análise'
                : 'Enviar para análise da Meta'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Avançar
              <Icon as={LuArrowRight} />
            </Button>
          )}
        </HStack>
      </Flex>
    </Stack>
  )
}

function StepIndicator({ current }: { current: number }) {
  return (
    <HStack
      gap={2}
      wrap="wrap"
    >
      {STEP_LABELS.map((label, index) => {
        const isActive = index === current
        const isDone = index < current
        return (
          <HStack
            gap={2}
            key={label}
          >
            <Flex
              align="center"
              bg={isActive || isDone ? 'colorPalette.solid' : 'bg.muted'}
              borderRadius="full"
              color={isActive || isDone ? 'colorPalette.contrast' : 'fg.muted'}
              fontSize="xs"
              fontWeight="bold"
              h={6}
              justify="center"
              w={6}
            >
              {isDone ? <Icon as={LuCheck} /> : index + 1}
            </Flex>
            <Text
              color={isActive ? 'fg' : 'fg.muted'}
              display={{ base: 'none', md: 'block' }}
              fontSize="sm"
              fontWeight={isActive ? 'semibold' : 'normal'}
            >
              {label}
            </Text>
          </HStack>
        )
      })}
    </HStack>
  )
}

type StepProps = {
  updateField: <K extends keyof MetaTemplateFormValues>(
    key: K,
    value: MetaTemplateFormValues[K]
  ) => void
  values: MetaTemplateFormValues
}

function StepIdentification({
  canEditCategory,
  isEditMode,
  technicalName,
  updateField,
  values,
}: StepProps & {
  canEditCategory: boolean
  isEditMode: boolean
  technicalName?: string
}) {
  return (
    <Stack gap={4}>
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        Dê um nome para você reconhecer este template e escolha a categoria da
        mensagem.
      </Text>

      <Grid
        gap={4}
        templateColumns={{ base: '1fr', md: '1fr 1fr' }}
      >
        <Field.Root required>
          <Field.Label>Nome amigável</Field.Label>
          <Input
            disabled={isEditMode}
            maxLength={120}
            onChange={(e) => updateField('displayName', e.target.value)}
            placeholder="Promoção Verão 2026"
            value={values.displayName}
          />
          <Field.HelperText>
            {isEditMode
              ? `Identificador na Meta: ${technicalName}`
              : `Nome para você identificar o template. O identificador enviado à Meta será gerado automaticamente${
                  values.displayName.trim()
                    ? `: ${previewMetaTemplateName(values.displayName)}`
                    : '.'
                }`}
          </Field.HelperText>
        </Field.Root>

        <Field.Root required>
          <Field.Label>Categoria</Field.Label>
          <Select.Root
            collection={categoryOptions}
            disabled={isEditMode && !canEditCategory}
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
          <Field.HelperText>
            Marketing para promoções, Utilidade para avisos e Autenticação para
            códigos.
          </Field.HelperText>
        </Field.Root>
      </Grid>
    </Stack>
  )
}

function StepMedia({
  headerPreviewUrl,
  onToggleMedia,
  onUpload,
  updateField,
  values,
}: StepProps & {
  headerPreviewUrl: string | null
  onToggleMedia: (enabled: boolean) => void
  onUpload: (files: File[]) => void
}) {
  return (
    <Stack gap={4}>
      <Box>
        <Text
          fontWeight="medium"
          mb={1}
        >
          Deseja adicionar mídia à mensagem?
        </Text>
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          Você pode incluir uma imagem, vídeo ou documento no topo da mensagem.
          Isso é opcional.
        </Text>
      </Box>

      <HStack gap={2}>
        <Button
          onClick={() => onToggleMedia(true)}
          variant={values.headerEnabled ? 'solid' : 'outline'}
        >
          Sim, adicionar mídia
        </Button>
        <Button
          onClick={() => onToggleMedia(false)}
          variant={!values.headerEnabled ? 'solid' : 'outline'}
        >
          Não, seguir sem mídia
        </Button>
      </HStack>

      {values.headerEnabled && (
        <Stack
          borderColor="border"
          borderRadius="lg"
          borderWidth="1px"
          gap={3}
          p={4}
        >
          <Field.Root>
            <Field.Label>Tipo de mídia</Field.Label>
            <Select.Root
              collection={mediaFormatOptions}
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
                  <Select.ValueText placeholder="Tipo de mídia" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {mediaFormatOptions.items.map((item) => (
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
                <Field.Label>Título de texto</Field.Label>
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
                    onChange={(e) => updateField('headerExample', e.target.value)}
                    placeholder="Verão 2026"
                    value={values.headerExample}
                  />
                </Field.Root>
              )}
            </>
          ) : (
            <Field.Root>
              <Field.Label>Arquivo</Field.Label>
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
                  onUpload(details.acceptedFiles)
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
              {(headerPreviewUrl || values.headerImageUrl) &&
                values.headerFormat === 'IMAGE' && (
                  <Image
                    alt="Preview mídia"
                    borderRadius="md"
                    maxH="180px"
                    mt={2}
                    objectFit="cover"
                    src={headerPreviewUrl ?? values.headerImageUrl ?? undefined}
                  />
                )}
            </Field.Root>
          )}
        </Stack>
      )}
    </Stack>
  )
}

function StepMessage({
  updateField,
  values,
  variableCount,
}: StepProps & { variableCount: number }) {
  return (
    <Stack gap={4}>
      <Field.Root required>
        <Field.Label>Corpo da mensagem</Field.Label>
        <Textarea
          maxLength={1024}
          minH="140px"
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
    </Stack>
  )
}

function StepFooterButtons({
  onAddButton,
  onRemoveButton,
  updateField,
  values,
}: StepProps & {
  onAddButton: (type: MetaTemplateButtonType) => void
  onRemoveButton: (index: number) => void
}) {
  return (
    <Stack gap={4}>
      <Field.Root>
        <Field.Label>Rodapé (opcional)</Field.Label>
        <Input
          maxLength={60}
          onChange={(e) =>
            updateField('footerText', sanitizeFooterText(e.target.value))
          }
          placeholder="Responda SAIR para não receber promoções"
          value={values.footerText}
        />
        <Field.HelperText>
          O rodapé não pode conter quebras de linha nem emojis.
        </Field.HelperText>
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
          <Text fontWeight="medium">Botões (opcional)</Text>
          <HStack gap={2}>
            <Button
              disabled={values.buttons.length >= 3}
              onClick={() => onAddButton('QUICK_REPLY')}
              size="xs"
              variant="outline"
            >
              <Icon as={LuPlus} />
              Resposta
            </Button>
            <Button
              disabled={values.buttons.length >= 3}
              onClick={() => onAddButton('URL')}
              size="xs"
              variant="outline"
            >
              <Icon as={LuPlus} />
              Link
            </Button>
            <Button
              disabled={values.buttons.length >= 3}
              onClick={() => onAddButton('PHONE_NUMBER')}
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
                bg="bg.subtle"
                borderRadius="md"
                key={index}
                p={3}
              >
                <Flex
                  align="center"
                  justify="space-between"
                  mb={2}
                >
                  <Badge variant="subtle">{BUTTON_TYPE_LABELS[button.type]}</Badge>
                  <Button
                    onClick={() => onRemoveButton(index)}
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
                          placeholder="https://seusite.com/venda/{{1}}"
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
    </Stack>
  )
}
