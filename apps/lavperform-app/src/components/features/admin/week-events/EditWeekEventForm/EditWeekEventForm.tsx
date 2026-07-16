import {
  Alert,
  Box,
  Button,
  Field,
  Fieldset,
  FileUpload,
  Icon,
  Image,
  Stack,
  Switch,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FiTrash2 } from 'react-icons/fi'
import { LuUpload } from 'react-icons/lu'
import { RiSaveLine } from 'react-icons/ri'

import {
  CustomDrawer,
  DeleteConfirmationDialog,
  FileUploadList,
  Input,
  Textarea,
  toaster,
} from '@/components'
import { useDeleteWeekEvent, useUpdateWeekEvent } from '@/hooks/queries'
import { MAX_FILE_SIZE } from '@/utils/constants/upload'
import { uploadImage } from '@/utils/upload'

import type {
  EditWeekEventFormData,
  EditWeekEventFormProps,
} from './EditWeekEventForm.types'

function EditWeekEventForm({ isOpen, onClose, event }: EditWeekEventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateWeekEvent = useUpdateWeekEvent()
  const deleteWeekEvent = useDeleteWeekEvent()

  const { register, handleSubmit, control, reset } =
    useForm<EditWeekEventFormData>({
      defaultValues: {
        title: '',
        description: '',
        coverImage: null,
        ctaLabel: '',
        ctaUrl: '',
        isStream: false,
        eventDate: '',
      },
    })

  useEffect(() => {
    if (event && isOpen) {
      // Formatar a data para o formato datetime-local (YYYY-MM-DDTHH:mm)
      const eventDate = new Date(event.eventDate)
      const formattedDate = eventDate.toISOString().slice(0, 16)

      reset({
        title: event.title,
        description: event.description,
        coverImage: null,
        ctaLabel: event.ctaLabel,
        ctaUrl: event.ctaUrl,
        isStream: event.isStream,
        eventDate: formattedDate,
      })
    }
  }, [event, isOpen, reset])

  const onSubmit = useCallback(
    async (data: EditWeekEventFormData) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        let coverImage = event?.coverImage || ''

        // Se uma nova imagem foi selecionada, fazer upload
        if (data.coverImage && data.coverImage.length > 0) {
          const uploadResult = await uploadImage({
            file: data.coverImage[0],
            folder: 'courses/week-events',
          })

          if (!uploadResult.success || !uploadResult.url) {
            setIsSubmitting(false)
            return
          }

          coverImage = uploadResult.url
        }

        // Se não tem URL de cover, não continua
        if (!coverImage) {
          toaster.create({
            title: 'Imagem obrigatória',
            description: 'Por favor, selecione uma imagem de capa.',
            type: 'error',
          })
          setIsSubmitting(false)
          return
        }

        // Converter a data para ISO
        const eventDateFormatted = new Date(data.eventDate)

        const payload = {
          title: data.title,
          description: data.description,
          coverImage,
          ctaLabel: data.ctaLabel,
          ctaUrl: data.ctaUrl,
          isStream: data.isStream,
          eventDate: eventDateFormatted.toISOString(),
        }

        await updateWeekEvent.mutateAsync({
          id: event.id,
          data: payload,
        })

        toaster.create({
          title: 'Evento atualizado',
          description: 'O evento da semana foi atualizado com sucesso.',
          type: 'success',
        })

        onClose()
      } catch {
        toaster.create({
          title: 'Erro',
          description: 'Ocorreu um erro ao salvar o evento da semana.',
          type: 'error',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [event, isSubmitting, updateWeekEvent, onClose]
  )

  const handleDelete = useCallback(async () => {
    if (!event) return

    try {
      await deleteWeekEvent.mutateAsync(event.id)
      toaster.create({
        title: 'Evento excluído',
        description: 'O evento da semana foi excluído com sucesso.',
        type: 'success',
      })
      onClose()
    } catch {
      toaster.create({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir o evento da semana.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [event, deleteWeekEvent, onClose])

  return (
    <CustomDrawer
      footer={
        <>
          <Box mr="auto">
            <DeleteConfirmationDialog
              confirmButton={
                <>
                  <FiTrash2 />
                  Excluir
                </>
              }
              isLoading={deleteWeekEvent.isPending}
              onClick={handleDelete}
              title="Confirmar Exclusão"
              trigger={
                <Button
                  colorPalette="red"
                  disabled={isSubmitting}
                  variant="outline"
                >
                  <FiTrash2 />
                  Excluir
                </Button>
              }
            />
          </Box>
          <Button
            disabled={isSubmitting}
            onClick={onClose}
            variant="surface"
          >
            Cancelar
          </Button>
          <Button
            disabled={isSubmitting}
            form="edit-week-event-form"
            loading={isSubmitting}
            loadingText="Salvando..."
            type="submit"
          >
            <RiSaveLine />
            Atualizar
          </Button>
        </>
      }
      isOpen={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size="md"
      title="Editar Evento da Semana"
    >
      <form
        id="edit-week-event-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Stack gap={6}>
          <Fieldset.Root>
            <Fieldset.Legend>Imagem de Capa</Fieldset.Legend>
            <Fieldset.Content>
              {event?.coverImage && (
                <Box mb={4}>
                  <Image
                    alt="Preview"
                    borderRadius="md"
                    maxH={200}
                    objectFit="cover"
                    src={event.coverImage}
                  />
                </Box>
              )}
              <FileUpload.Root
                accept="image/*"
                maxFiles={1}
                {...register('coverImage')}
              >
                <FileUpload.Dropzone>
                  <FileUpload.Label>
                    Clique ou arraste uma imagem
                  </FileUpload.Label>
                  <FileUpload.ItemGroup>
                    <FileUploadList />
                  </FileUpload.ItemGroup>
                </FileUpload.Dropzone>
                <FileUpload.HiddenInput />
                <FileUpload.Trigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                  >
                    <Icon>
                      <LuUpload />
                    </Icon>
                    Escolher arquivo
                  </Button>
                </FileUpload.Trigger>
              </FileUpload.Root>
              <Alert.Root
                mt={2}
                size="sm"
                status="info"
                variant="surface"
              >
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    Tamanho máximo: {MAX_FILE_SIZE}MB. Formatos aceitos: JPG,
                    PNG, WEBP.
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Content>
              <Input
                control={control}
                label="Título"
                placeholder="Digite o título do evento"
                required
                {...register('title', {
                  required: 'Título é obrigatório',
                })}
              />
              <Textarea
                control={control}
                label="Descrição"
                placeholder="Digite a descrição do evento"
                required
                rows={3}
                {...register('description', {
                  required: 'Descrição é obrigatória',
                })}
              />
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Content>
              <Input
                control={control}
                label="Data e Hora do Evento"
                required
                type="datetime-local"
                {...register('eventDate', {
                  required: 'Data do evento é obrigatória',
                })}
              />
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Content>
              <Input
                control={control}
                label="Label do CTA"
                placeholder="Ex: Participar do evento"
                required
                {...register('ctaLabel', {
                  required: 'Label do CTA é obrigatória',
                })}
              />
              <Input
                control={control}
                label="URL do CTA"
                placeholder="https://..."
                required
                type="url"
                {...register('ctaUrl', {
                  required: 'URL do CTA é obrigatória',
                })}
              />
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Content>
              <Controller
                control={control}
                name="isStream"
                render={({ field }) => (
                  <Field.Root>
                    <Switch.Root
                      checked={field.value}
                      colorPalette="green"
                      name={field.name}
                      onCheckedChange={({ checked }) => field.onChange(checked)}
                    >
                      <Switch.HiddenInput onBlur={field.onBlur} />
                      <Switch.Control />
                      <Switch.Label>É uma transmissão ao vivo?</Switch.Label>
                    </Switch.Root>
                  </Field.Root>
                )}
              />
            </Fieldset.Content>
          </Fieldset.Root>
        </Stack>
      </form>
    </CustomDrawer>
  )
}

export { EditWeekEventForm, type EditWeekEventFormProps }
