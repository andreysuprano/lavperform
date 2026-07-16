import { Alert, Box, Field, FileUpload, Icon, Stack } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import * as yup from 'yup'

import { FileUploadList } from '@/components'
import { listToBase64 } from '@/firebase/storage'

import { FormStepsProps } from './FormSteps.types'

const MAX_FILE_SIZE = 25
const MAX_FILE_SIZE_IN_MB = MAX_FILE_SIZE * 1024 * 1024
const MAX_FILES = 10

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png']

const schema = yup.object({
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
        if (!files?.length) return true
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
        if (!files?.length) return true
        for (const file of files) {
          if (file.size > MAX_FILE_SIZE_IN_MB) {
            return false
          }
        }
        return true
      }
    ),
})

type FormData = yup.InferType<typeof schema>

export function Images(props: FormStepsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      images: [],
    },
  })

  const onSubmit = async (data: FormData) => {
    const files = Array.isArray(data.images) ? data.images : []
    const imagesToBase64 =
      files.length > 0 ? await listToBase64(files as File[]) : []

    props.onSubmit?.({
      ...data,
      imagesBase64: imagesToBase64,
    } as any)
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
          Imagens são <strong>opcionais</strong>. Você pode anexar até{' '}
          <strong>{MAX_FILES}</strong> imagens (.png ou .jpg, até{' '}
          {MAX_FILE_SIZE}MB cada). Para os disparos, sugerimos resolução{' '}
          <strong>1080x1080</strong> ou proporcional.
        </Alert.Title>
      </Alert.Root>

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
  )
}
