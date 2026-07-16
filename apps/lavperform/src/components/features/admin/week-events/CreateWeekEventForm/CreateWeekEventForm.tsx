import {
  Alert,
  Button,
  Field,
  Fieldset,
  FileUpload,
  Icon,
  Stack,
  Switch,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import {
  CustomDrawer,
  FileUploadList,
  Input,
  Textarea,
  toaster,
} from '@/components'
import { useCreateWeekEvent } from '@/hooks/queries'
import { MAX_FILE_SIZE } from '@/utils/constants/upload'
import { uploadImage } from '@/utils/upload'

import type { CreateWeekEventFormData } from './CreateWeekEventForm.types'

function CreateWeekEventForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createWeekEvent = useCreateWeekEvent()

  const { register, handleSubmit, control, reset } =
    useForm<CreateWeekEventFormData>({
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

  const handleClose = useCallback(() => {
    reset()
    setIsOpen(false)
  }, [reset])

  const onSubmit = useCallback(
    async (data: CreateWeekEventFormData) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        // Valida se tem imagem
        if (!data.coverImage || data.coverImage.length === 0) {
          toaster.create({
            title: 'Imagem obrigatória',
            description: 'Por favor, selecione uma imagem de capa.',
            type: 'error',
          })
          setIsSubmitting(false)
          return
        }

        const uploadResult = await uploadImage({
          file: data.coverImage[0],
          folder: 'courses/week-events',
        })

        if (!uploadResult.success || !uploadResult.url) {
          setIsSubmitting(false)
          return
        }

        const coverImage = uploadResult.url

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

        await createWeekEvent.mutateAsync(payload)

        toaster.create({
          title: 'Evento criado',
          description: 'O evento da semana foi criado com sucesso.',
          type: 'success',
        })

        handleClose()
      } catch {
        toaster.create({
          title: 'Erro',
          description: 'Ocorreu um erro ao criar o evento da semana.',
          type: 'error',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, createWeekEvent, handleClose]
  )

  return (
    <>
      <Button
        colorScheme="blue"
        onClick={() => setIsOpen(true)}
        w={{ base: 'full', md: '200px' }}
      >
        <RiAddLine />
        Novo Evento
      </Button>

      <CustomDrawer
        footer={
          <>
            <Button
              disabled={isSubmitting}
              onClick={handleClose}
              variant="surface"
            >
              Cancelar
            </Button>
            <Button
              disabled={isSubmitting}
              form="create-week-event-form"
              loading={isSubmitting}
              loadingText="Salvando..."
              type="submit"
            >
              <RiSaveLine />
              Salvar
            </Button>
          </>
        }
        isOpen={isOpen}
        onOpenChange={(e) => !e.open && handleClose()}
        size="md"
        title="Novo Evento da Semana"
      >
        <form
          id="create-week-event-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={6}>
            <Fieldset.Root>
              <Fieldset.Legend>Imagem de Capa</Fieldset.Legend>
              <Fieldset.Content>
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
                        onCheckedChange={({ checked }) =>
                          field.onChange(checked)
                        }
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
    </>
  )
}

export { CreateWeekEventForm }
