import {
  Alert,
  Box,
  Button,
  Field,
  FileUpload,
  Float,
  HStack,
  Icon,
  Image,
  Input,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { LuUpload, LuX } from 'react-icons/lu'
import * as yup from 'yup'

import { FileUploadList } from '@/components'
import { listToBase64 } from '@/firebase/storage'

import type { CampaignCreative } from './FormSteps.types'

const MAX_FILE_SIZE = 25
const MAX_FILE_SIZE_IN_MB = MAX_FILE_SIZE * 1024 * 1024
/** Máximo de imagens por criativo (enviadas como `imageUrls` na API). */
const MAX_CREATIVE_IMAGES = 10

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png']

type FormValues = {
  image: File[]
  title: string
  description: string
  link: string
}

function toImageFieldFiles(value: unknown): File[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is File => item instanceof File)
}

function resolveInitialExistingUrls(
  initialCreative?: CampaignCreative | null
): string[] {
  const fromList =
    initialCreative?.imageUrls?.filter(
      (u): u is string => typeof u === 'string' && u.trim().length > 0
    ) ?? []
  if (fromList.length > 0) return fromList
  if (initialCreative?.image?.url?.trim()) {
    return [initialCreative.image.url.trim()]
  }
  return []
}

function buildFormSchema(descriptionMaxLength: number, maxNewFiles: number) {
  return yup.object({
    image: yup
      .mixed()
      .transform((value: unknown) => {
        if (Array.isArray(value)) return value
        if (
          value &&
          typeof value === 'object' &&
          'length' in value &&
          typeof (value as { length: number }).length === 'number' &&
          (value as { length: number }).length > 0
        ) {
          return Array.from(value as ArrayLike<unknown>)
        }
        return []
      })
      .test('file-format', 'A imagem deve ser do tipo .png ou .jpg', (value: unknown) => {
        const files = toImageFieldFiles(value)
        if (!files.length) return true
        for (const file of files) {
          if (!SUPPORTED_FORMATS.includes(file.type)) return false
        }
        return true
      })
      .test(
        'file-size',
        `A imagem deve ter no máximo ${MAX_FILE_SIZE}MB`,
        (value: unknown) => {
          const files = toImageFieldFiles(value)
          if (!files.length) return true
          for (const file of files) {
            if (file.size > MAX_FILE_SIZE_IN_MB) return false
          }
          return true
        }
      )
      .test(
        'file-count',
        `Selecione no máximo ${maxNewFiles} imagens`,
        (value: unknown) => {
          const files = toImageFieldFiles(value)
          return files.length <= maxNewFiles
        }
      ),
    title: yup.string().max(80, 'O título deve ter no máximo 80 caracteres'),
    description: yup
      .string()
      .max(
        descriptionMaxLength,
        `A descrição deve ter no máximo ${descriptionMaxLength} caracteres`
      ),
    link: yup
      .string()
      .trim()
      .optional()
      .test('is-url', 'Informe um link válido (https://...)', (value) => {
        if (!value) return true
        try {
          const url = new URL(value)
          return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
          return false
        }
      }),
  })
}

type Props = {
  initialCreative?: CampaignCreative | null
  isEditing?: boolean
  /**
   * Indica se o upload de imagem deve ser exibido.
   * Quando false (ex.: somente canais sem suporte a imagem selecionados),
   * o campo de imagem é ocultado. Padrão: true.
   */
  allowImage?: boolean
  /** Teto de caracteres da descrição (definido pelo catálogo do canal). Padrão: 500. */
  descriptionMaxLength?: number
  /** Fecha o painel e descarta alterações (criação ou edição). */
  onCancel?: () => void
  onSubmit: (creative: Omit<CampaignCreative, 'id'>) => void
}

export function CreativeForm({
  initialCreative,
  isEditing,
  allowImage = true,
  descriptionMaxLength = 500,
  onCancel,
  onSubmit,
}: Props) {
  const initialExistingUrls = useMemo(
    () => resolveInitialExistingUrls(initialCreative),
    [initialCreative]
  )

  const [existingImageUrls, setExistingImageUrls] =
    useState<string[]>(initialExistingUrls)

  useEffect(() => {
    setExistingImageUrls(initialExistingUrls)
  }, [initialExistingUrls])

  const maxNewFiles = Math.max(0, MAX_CREATIVE_IMAGES - existingImageUrls.length)

  const defaults = useMemo<FormValues>(
    () => ({
      image: [],
      title: initialCreative?.title ?? '',
      description: initialCreative?.description ?? '',
      link: initialCreative?.link ?? '',
    }),
    [initialCreative]
  )

  const schema = useMemo(
    () => buildFormSchema(descriptionMaxLength, maxNewFiles),
    [descriptionMaxLength, maxNewFiles]
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<FormValues>({
    mode: 'onChange',
    resolver: yupResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: defaults,
  })

  useEffect(() => {
    reset(defaults)
  }, [defaults, reset])

  const titleValue = watch('title')
  const descriptionValue = watch('description')
  const linkValue = watch('link')

  const handleRemoveExistingImage = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async (values: FormValues) => {
    const newFiles = toImageFieldFiles(values.image)
    const totalImages = existingImageUrls.length + newFiles.length

    if (totalImages > MAX_CREATIVE_IMAGES) {
      setError('image', {
        type: 'manual',
        message: `O criativo pode ter no máximo ${MAX_CREATIVE_IMAGES} imagens no total.`,
      })
      return
    }

    const hasAnyField =
      (allowImage && totalImages > 0) ||
      !!values.title?.trim() ||
      !!values.description?.trim() ||
      !!values.link?.trim()

    if (!hasAnyField) {
      setError('title', {
        type: 'manual',
        message: allowImage
          ? 'Informe ao menos um campo (imagem, título, descrição ou link).'
          : 'Informe ao menos um campo (título, descrição ou link).',
      })
      return
    }

    const base64List =
      allowImage && newFiles.length > 0 ? await listToBase64(newFiles) : []
    const firstBase64 = base64List[0]

    let image: CampaignCreative['image'] = null
    let imageBase64List: string[] | undefined
    let imageUrls: string[] = []

    if (allowImage) {
      const keptUrls = existingImageUrls.filter(Boolean)
      imageUrls = keptUrls

      if (firstBase64) {
        image = { base64: firstBase64 as string }
        imageBase64List =
          base64List.length > 0
            ? (base64List.filter(Boolean) as string[])
            : undefined
      } else if (keptUrls.length > 0) {
        image = { url: keptUrls[0] }
      }
    }

    onSubmit({
      image,
      ...(allowImage
        ? { imageUrls, imageBase64List }
        : { imageUrls: [], imageBase64List: undefined }),
      title: values.title?.trim() ? values.title.trim() : undefined,
      description: values.description?.trim() ? values.description.trim() : undefined,
      link: values.link?.trim() ? values.link.trim() : undefined,
    })

    setExistingImageUrls([])
    reset({
      image: [],
      title: '',
      description: '',
      link: '',
    })
  }

  const handleCancel = () => {
    clearErrors()
    setExistingImageUrls(initialExistingUrls)
    reset({
      image: [],
      title: '',
      description: '',
      link: '',
    })
    onCancel?.()
  }

  return (
    <Stack gap={4}>
      {allowImage ? (
        <Stack gap={2}>
          <Text fontWeight="medium">Imagens (opcional)</Text>

          {existingImageUrls.length > 0 && (
            <Stack gap={2}>
              <HStack justify="space-between">
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                >
                  Imagens atuais ({existingImageUrls.length})
                </Text>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Não serão reenviadas
                </Text>
              </HStack>
              <HStack
                gap={4}
                wrap="wrap"
              >
                {existingImageUrls.map((imageUrl, index) => (
                  <Box
                    borderColor="border.muted"
                    borderRadius="md"
                    borderWidth={1}
                    key={`${imageUrl}-${index}`}
                    p={2}
                    position="relative"
                  >
                    <Image
                      alt={`Imagem ${index + 1}`}
                      maxH="100px"
                      maxW="100px"
                      objectFit="cover"
                      src={imageUrl}
                    />
                    <Float placement="top-end">
                      <Box
                        alignItems="center"
                        aria-label="Remover imagem"
                        as="button"
                        bg="red.500"
                        borderRadius="sm"
                        boxSize="5"
                        color="white"
                        cursor="pointer"
                        display="flex"
                        justifyContent="center"
                        m={1}
                        onClick={() => handleRemoveExistingImage(index)}
                        title="Remover imagem"
                      >
                        <LuX size={14} />
                      </Box>
                    </Float>
                  </Box>
                ))}
              </HStack>
            </Stack>
          )}

          <Field.Root invalid={!!errors.image}>
            <FileUpload.Root
              accept="image/jpeg, image/png"
              alignItems="stretch"
              maxFileSize={MAX_FILE_SIZE_IN_MB}
              maxFiles={maxNewFiles > 0 ? maxNewFiles : 1}
              {...register('image')}
            >
              <FileUpload.HiddenInput />
              <FileUpload.Dropzone
                _hover={{
                  background: 'bg.muted',
                  cursor: maxNewFiles > 0 ? 'pointer' : 'not-allowed',
                }}
                alignItems="center"
                borderColor="bg.inverted"
                borderRadius="lg"
                borderStyle="dashed"
                borderWidth={1}
                display="flex"
                flexDirection="column"
                gap={2}
                justifyContent="center"
                opacity={maxNewFiles > 0 ? 1 : 0.6}
                pointerEvents={maxNewFiles > 0 ? 'auto' : 'none'}
                py="4"
                unstyled
              >
                <Icon
                  color="fg.muted"
                  size="md"
                >
                  <LuUpload />
                </Icon>
                <FileUpload.DropzoneContent>
                  <Box>
                    {maxNewFiles > 0
                      ? 'Arraste e solte as imagens aqui'
                      : 'Limite de imagens atingido'}
                  </Box>
                  <Box color="fg.muted">
                    .png, .jpg até {MAX_FILE_SIZE}MB cada (máx. {MAX_CREATIVE_IMAGES}{' '}
                    no total)
                  </Box>
                </FileUpload.DropzoneContent>
              </FileUpload.Dropzone>
              <FileUploadList />
            </FileUpload.Root>
            {!!errors.image?.message && (
              <Field.ErrorText>{String(errors.image.message)}</Field.ErrorText>
            )}
          </Field.Root>
        </Stack>
      ) : (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Description>
            O canal selecionado não suporta imagens. O criativo será enviado apenas com texto.
          </Alert.Description>
        </Alert.Root>
      )}

      <Field.Root invalid={!!errors.title}>
        <Field.Label>Título (opcional)</Field.Label>
        <Input
          placeholder="Ex.: Promoção especial"
          value={titleValue}
          {...register('title')}
        />
        {!!errors.title && <Field.ErrorText>{errors.title.message}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.description}>
        <Field.Label>Descrição (opcional)</Field.Label>
        <Textarea
          maxLength={descriptionMaxLength}
          placeholder="Texto do criativo / comunicação"
          resize="vertical"
          rows={4}
          value={descriptionValue}
          {...register('description')}
        />
        <HStack justify="space-between">
          <Field.HelperText>Comunicação por-criativo</Field.HelperText>
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            {descriptionValue.length}/{descriptionMaxLength}
          </Text>
        </HStack>
        {!!errors.description && (
          <Field.ErrorText>{errors.description.message}</Field.ErrorText>
        )}
      </Field.Root>

      <Field.Root invalid={!!errors.link}>
        <Field.Label>Link (opcional)</Field.Label>
        <Input
          placeholder="https://..."
          value={linkValue}
          {...register('link')}
        />
        {!!errors.link && <Field.ErrorText>{errors.link.message}</Field.ErrorText>}
      </Field.Root>

      <HStack justify="flex-end">
        <Button
          onClick={handleCancel}
          variant="surface"
        >
          Cancelar
        </Button>
        <Button onClick={handleSubmit(submit)}>
          {isEditing ? 'Atualizar criativo' : 'Salvar criativo'}
        </Button>
      </HStack>
    </Stack>
  )
}
