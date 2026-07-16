import {
  Alert,
  Box,
  Button,
  Fieldset,
  FileUpload,
  Icon,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import { RiAddLine, RiDeleteBinLine, RiSaveLine } from 'react-icons/ri'

import {
  CustomDrawer,
  FileUploadList,
  Input,
  Textarea,
  toaster,
} from '@/components'
import { useCreateModule } from '@/hooks/queries'
import type { CreateModulePayload } from '@/types'
import { uploadImage } from '@/utils/upload'

const MAX_FILE_SIZE = 5
const MAX_FILE_SIZE_IN_MB = MAX_FILE_SIZE * 1024 * 1024

interface LessonFileInput {
  name: string
  fileUrl: string
}

interface LessonInput {
  title: string
  videoUrl: string
  description: string
  thumbnailUrl: FileList | null
  lessonFiles: LessonFileInput[]
}

interface FormData {
  title: string
  description: string
  lessons: LessonInput[]
}

interface CreateModuleFormProps {
  courseId: string
}

export function CreateModuleForm({ courseId }: CreateModuleFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, control, reset } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      lessons: [
        {
          title: '',
          videoUrl: '',
          description: '',
          thumbnailUrl: null,
          lessonFiles: [],
        },
      ],
    },
  })

  const {
    fields: lessonFields,
    append: appendLesson,
    remove: removeLesson,
  } = useFieldArray({
    control,
    name: 'lessons',
  })

  const createModuleMutation = useCreateModule()

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        // Upload das thumbnails das aulas
        const lessonsWithUploadedThumbnails = await Promise.all(
          data.lessons.map(async (lesson, lessonIndex) => {
            let thumbnailUrl: string | undefined = undefined

            if (lesson.thumbnailUrl && lesson.thumbnailUrl.length > 0) {
              toaster.create({
                title: `Fazendo upload da thumbnail da aula ${
                  lessonIndex + 1
                }...`,
                description: 'Por favor, aguarde.',
                type: 'info',
              })

              const file = lesson.thumbnailUrl[0]
              const uploadResult = await uploadImage({
                file,
                folder: 'lessons',
              })

              if (!uploadResult.success || !uploadResult.url) {
                throw new Error(
                  uploadResult.error ||
                    'Falha ao fazer upload da thumbnail. Tente novamente.'
                )
              }

              thumbnailUrl = uploadResult.url
            }

            return {
              title: lesson.title,
              videoUrl: lesson.videoUrl,
              description: lesson.description || undefined,
              thumbnailUrl,
              lessonFiles: lesson.lessonFiles.filter(
                (file) => file.name && file.fileUrl
              ),
            }
          })
        )

        const payload: CreateModulePayload = {
          title: data.title,
          description: data.description,
          lessons: lessonsWithUploadedThumbnails,
        }

        await createModuleMutation.mutateAsync({ courseId, data: payload })

        toaster.create({
          title: 'Sucesso',
          description: 'Módulo criado com sucesso!',
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
          'Não foi possível criar o módulo.'

        toaster.dismiss()

        toaster.create({
          title: 'Erro ao criar módulo',
          description: errorMessage,
          type: 'error',
          closable: true,
          duration: 4000,
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, createModuleMutation, reset, courseId]
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
            form="create-module-form"
            loading={isSubmitting}
            loadingText="Salvando..."
            type="submit"
          >
            <RiSaveLine />
            Salvar módulo
          </Button>
        </>
      }
      isOpen={isOpen}
      onOpenChange={(e) => setIsOpen(e.open)}
      size="xl"
      title="Adicionar novo módulo"
      trigger={
        <Button
          size="sm"
          variant="outline"
        >
          <RiAddLine />
          Adicionar Módulo
        </Button>
      }
    >
      <form
        id="create-module-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Stack gap={6}>
          {/* Informações do Módulo */}
          <Fieldset.Root>
            <Fieldset.Legend>Informações do Módulo</Fieldset.Legend>
            <Fieldset.Content>
              <Input
                control={control}
                label="Título do módulo"
                placeholder="Digite o título do módulo"
                required
                {...register('title', {
                  required: 'Título é obrigatório',
                })}
              />
              <Textarea
                control={control}
                label="Descrição"
                placeholder="Digite a descrição do módulo"
                required
                rows={3}
                {...register('description', {
                  required: 'Descrição é obrigatória',
                })}
              />
            </Fieldset.Content>
          </Fieldset.Root>

          {/* Aulas */}
          <Fieldset.Root>
            <Fieldset.Legend>Aulas do Módulo</Fieldset.Legend>
            <Stack gap={4}>
              {lessonFields.map((field, lessonIndex) => (
                <Stack
                  borderColor="gray.200"
                  borderRadius="md"
                  borderWidth="1px"
                  gap={3}
                  key={field.id}
                  p={4}
                  position="relative"
                >
                  {lessonFields.length > 1 && (
                    <IconButton
                      aria-label="Remover aula"
                      onClick={() => removeLesson(lessonIndex)}
                      position="absolute"
                      right={2}
                      size="sm"
                      top={2}
                      variant="ghost"
                    >
                      <RiDeleteBinLine />
                    </IconButton>
                  )}
                  <Input
                    control={control}
                    label={`Título da Aula ${lessonIndex + 1}`}
                    placeholder="Digite o título da aula"
                    required
                    {...register(`lessons.${lessonIndex}.title`, {
                      required: 'Título é obrigatório',
                    })}
                  />
                  <Input
                    control={control}
                    label="URL do Vídeo"
                    placeholder="https://youtube.com/..."
                    required
                    {...register(`lessons.${lessonIndex}.videoUrl`, {
                      required: 'URL do vídeo é obrigatória',
                    })}
                  />
                  <Stack gap={2}>
                    <Alert.Root
                      size="sm"
                      status="info"
                      variant="surface"
                    >
                      <Alert.Indicator />
                      <Alert.Title>
                        Thumbnail da aula (opcional). Recomendamos{' '}
                        <strong>1280x720</strong> ou proporcional.
                      </Alert.Title>
                    </Alert.Root>
                    <FileUpload.Root
                      accept="image/jpeg, image/png"
                      alignItems="stretch"
                      maxFileSize={MAX_FILE_SIZE_IN_MB}
                      maxFiles={1}
                      preventDocumentDrop
                      {...register(`lessons.${lessonIndex}.thumbnailUrl`)}
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
                        py="3"
                        unstyled
                      >
                        <Icon
                          color="fg.muted"
                          size="sm"
                        >
                          <LuUpload />
                        </Icon>
                        <FileUpload.DropzoneContent>
                          <Box fontSize="sm">Arraste a thumbnail aqui</Box>
                          <Box
                            color="fg.muted"
                            fontSize="xs"
                          >
                            .png, .jpg até {MAX_FILE_SIZE}MB
                          </Box>
                        </FileUpload.DropzoneContent>
                      </FileUpload.Dropzone>
                      <FileUploadList />
                    </FileUpload.Root>
                  </Stack>
                  <Textarea
                    control={control}
                    label="Descrição da Aula"
                    placeholder="Digite a descrição da aula (opcional)"
                    rows={2}
                    {...register(`lessons.${lessonIndex}.description`)}
                  />
                </Stack>
              ))}
              <Button
                onClick={() =>
                  appendLesson({
                    title: '',
                    videoUrl: '',
                    description: '',
                    thumbnailUrl: null,
                    lessonFiles: [],
                  })
                }
                size="sm"
                variant="outline"
              >
                <RiAddLine />
                Adicionar Aula
              </Button>
            </Stack>
          </Fieldset.Root>
        </Stack>
      </form>
    </CustomDrawer>
  )
}
