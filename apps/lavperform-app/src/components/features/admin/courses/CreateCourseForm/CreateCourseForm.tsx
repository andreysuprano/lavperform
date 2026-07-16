import {
  Alert,
  Box,
  Button,
  Fieldset,
  FileUpload,
  Icon,
  Stack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import {
  CustomDrawer,
  FileUploadList,
  Input,
  Textarea,
  toaster,
} from '@/components'
import { useCreateCourse } from '@/hooks/queries'
import type { CreateCoursePayload } from '@/types'
import { uploadImage } from '@/utils/upload'

const MAX_FILE_SIZE = 5
const MAX_FILE_SIZE_IN_MB = MAX_FILE_SIZE * 1024 * 1024

interface FormData {
  title: string
  description: string
  imageUrl: FileList | null
}

export function CreateCourseForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, control, reset } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      imageUrl: null,
    },
  })

  const createCourseMutation = useCreateCourse()

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        // Validação do arquivo de imagem
        if (!data.imageUrl || data.imageUrl.length === 0) {
          throw new Error('É necessário fazer upload da imagem de capa')
        }

        // Upload da imagem de capa
        const file = data.imageUrl[0]
        const uploadResult = await uploadImage({
          file,
          folder: 'courses',
        })

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(
            uploadResult.error ||
              'Falha ao fazer upload da imagem. Tente novamente.'
          )
        }

        const payload: CreateCoursePayload = {
          title: data.title,
          description: data.description,
          coverImageUrl: uploadResult.url,
        }

        await createCourseMutation.mutateAsync(payload)

        toaster.create({
          title: 'Sucesso',
          description: 'Curso criado com sucesso!',
          type: 'success',
          closable: true,
          duration: 4000,
        })

        reset()
        setIsOpen(false)
      } catch (error) {
        const err = error as {
          response?: { data?: { message?: string } }
          message?: string
        }

        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Não foi possível criar o curso.'

        toaster.dismiss()

        toaster.create({
          title: 'Erro ao criar curso',
          description: errorMessage,
          type: 'error',
          closable: true,
          duration: 4000,
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, createCourseMutation, reset]
  )

  return (
    <CustomDrawer
      footer={
        <>
          <Button
            disabled={isSubmitting}
            onClick={() => setIsOpen(false)}
            variant="surface"
          >
            Cancelar
          </Button>
          <Button
            disabled={isSubmitting}
            form="create-course-form"
            loading={isSubmitting}
            loadingText="Salvando..."
            type="submit"
          >
            <RiSaveLine />
            Salvar curso
          </Button>
        </>
      }
      isOpen={isOpen}
      onOpenChange={(e) => setIsOpen(e.open)}
      size="md"
      title="Adicionar novo curso"
      trigger={
        <Button w={{ base: 'full', md: 'auto' }}>
          <RiAddLine />
          Adicionar
        </Button>
      }
    >
      <form
        id="create-course-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Stack gap={4}>
          <Fieldset.Root>
            <Fieldset.Content>
              <Alert.Root
                status="warning"
                variant="surface"
              >
                <Alert.Indicator />
                <Alert.Title>
                  Para que todas as informações da sua imagem sejam exibidas,
                  sugerimos que a resolução da imagem seja de{' '}
                  <strong>1080x1080</strong> ou proporcional.
                </Alert.Title>
              </Alert.Root>
              <FileUpload.Root
                accept="image/jpeg, image/png"
                alignItems="stretch"
                maxFileSize={MAX_FILE_SIZE_IN_MB}
                maxFiles={1}
                preventDocumentDrop
                required
                {...register('imageUrl')}
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
              <Input
                control={control}
                label="Título do curso"
                placeholder="Digite o título do curso"
                required
                {...register('title', {
                  required: 'Título é obrigatório',
                })}
              />
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Content>
              <Textarea
                control={control}
                label="Descrição"
                placeholder="Digite a descrição do curso"
                required
                rows={4}
                {...register('description', {
                  required: 'Descrição é obrigatória',
                })}
              />
            </Fieldset.Content>
          </Fieldset.Root>
        </Stack>
      </form>
    </CustomDrawer>
  )
}
