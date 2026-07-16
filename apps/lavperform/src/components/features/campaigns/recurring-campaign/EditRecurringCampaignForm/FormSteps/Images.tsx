import {
  Alert,
  Box,
  Field,
  FileUpload,
  Float,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuUpload, LuX } from 'react-icons/lu'
import * as yup from 'yup'

import { FileUploadList } from '@/components'
import { listToBase64 } from '@/firebase/storage'

import { FormStepsProps } from './FormSteps.types'

const MAX_FILE_SIZE = 25
const MAX_FILE_SIZE_IN_MB = MAX_FILE_SIZE * 1024 * 1024

const MAX_FILES = 10

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png']

type FormData = {
  images: FileList | File[]
}

export function Images(props: FormStepsProps) {
  const [existingImages, setExistingImages] = useState<string[]>(
    props.formData?.imagesBase64 ?? []
  )

  // Ajusta a validação baseado nas imagens existentes
  const dynamicSchema = yup.object({
    images: yup
      .mixed()
      .transform((value) => {
        return Array.isArray(value)
          ? value
          : value && value.length > 0
          ? Array.from(value)
          : []
      })
      .test(
        'file-format',
        'As imagens devem ser do tipo .png ou .jpg',
        (files: any) => {
          if (!files || files.length === 0) return true
          for (const file of files) {
            if (!SUPPORTED_FORMATS.includes(file.type)) {
              return false
            }
          }
          return true
        }
      )
      .test(
        'file-size',
        `Cada imagem deve ter no máximo ${MAX_FILE_SIZE}MB`,
        (files: any) => {
          if (!files || files.length === 0) return true
          for (const file of files) {
            if (file.size > MAX_FILE_SIZE_IN_MB) {
              return false
            }
          }
          return true
        }
      ),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver(dynamicSchema) as any,
    defaultValues: {
      images: [],
    },
  })

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: any) => {
    // Converte apenas as novas imagens para base64
    const newImagesBase64 =
      data.images?.length > 0 ? await listToBase64(data.images) : []

    data = {
      ...data,
      // Imagens existentes (URLs do Firebase que não precisam re-upload)
      existingImageUrls: existingImages,
      // Novas imagens (base64 que precisam ser enviadas ao Firebase)
      newImagesBase64: newImagesBase64,
      // Total de imagens para validação
      totalImages: existingImages.length + newImagesBase64.length,
    }

    props.onSubmit?.(data)
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Alert.Root
        status="warning"
        variant="surface"
      >
        <Alert.Indicator />
        <Alert.Title>
          Imagens são <strong>opcionais</strong>. Você pode manter, remover ou
          adicionar até <strong>{MAX_FILES}</strong> imagens no total (.png ou
          .jpg, até {MAX_FILE_SIZE}MB cada). Sugerimos resolução{' '}
          <strong>1080x1080</strong> ou proporcional.
        </Alert.Title>
      </Alert.Root>

      {/* Imagens existentes */}
      {existingImages.length > 0 && (
        <Stack gap={2}>
          <HStack justifyContent="space-between">
            <Text fontWeight="medium">
              Imagens existentes no servidor ({existingImages.length})
            </Text>
            <Text
              color="gray.500"
              fontSize="sm"
            >
              Não serão reenviadas
            </Text>
          </HStack>
          <HStack
            gap={4}
            wrap="wrap"
          >
            {existingImages.map((imageUrl, index) => (
              <Box
                borderColor="green.300"
                borderRadius="md"
                borderWidth={2}
                key={index}
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
                <Box
                  bg="green.500"
                  borderRadius="sm"
                  bottom={1}
                  color="white"
                  fontSize="xs"
                  left={1}
                  position="absolute"
                  px={1}
                  py={0.5}
                >
                  Salva
                </Box>
              </Box>
            ))}
          </HStack>
        </Stack>
      )}

      <Stack gap={2}>
        <Text fontWeight="medium">
          {existingImages.length > 0
            ? 'Adicionar novas imagens'
            : 'Selecionar imagens'}
        </Text>
        <Field.Root
          cursor="pointer"
          invalid={!!errors.images}
        >
          <FileUpload.Root
            accept="image/jpeg, image/png"
            alignItems="stretch"
            maxFileSize={MAX_FILE_SIZE_IN_MB}
            maxFiles={MAX_FILES}
            {...register('images')}
          >
            <FileUpload.HiddenInput />
            <FileUpload.Dropzone
              _hover={{
                background: 'bg.muted',
                cursor: 'pointer',
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
                <Box>Arraste e solte a imagem aqui</Box>
                <Box color="fg.muted">.png, .jpg até {MAX_FILE_SIZE}MB</Box>
              </FileUpload.DropzoneContent>
            </FileUpload.Dropzone>
            <FileUploadList />
          </FileUpload.Root>
          {!!errors.images && (
            <Field.ErrorText>{errors.images?.message}</Field.ErrorText>
          )}
        </Field.Root>
      </Stack>
    </Stack>
  )
}
