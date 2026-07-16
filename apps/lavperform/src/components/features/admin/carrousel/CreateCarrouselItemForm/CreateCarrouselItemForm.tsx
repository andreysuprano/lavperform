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
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useCreateCarrouselItem } from '@/hooks/queries'
import { MAX_FILE_SIZE } from '@/utils/constants/upload'
import { uploadImage, validateImageFile } from '@/utils/upload'

import type {
  CreateCarrouselItemFormData,
  CreateCarrouselItemFormProps,
} from './CreateCarrouselItemForm.types'

function CreateCarrouselItemForm({ allItems }: CreateCarrouselItemFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createCarrouselItem = useCreateCarrouselItem()

  // Calcula a próxima ordem disponível
  const nextAvailableOrder = useMemo(() => {
    if (!allItems || allItems.length === 0) return 1
    return Math.max(...allItems.map((i) => i.order)) + 1
  }, [allItems])

  const { register, handleSubmit, control, reset } =
    useForm<CreateCarrouselItemFormData>({
      defaultValues: {
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: null,
        ctaLabel: '',
        ctaUrl: '',
        order: nextAvailableOrder,
        isStream: false,
      },
    })

  // Atualiza a ordem quando o formulário abre
  useEffect(() => {
    if (isOpen) {
      reset({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: null,
        ctaLabel: '',
        ctaUrl: '',
        order: nextAvailableOrder,
        isStream: false,
      })
    }
  }, [isOpen, nextAvailableOrder, reset])

  const handleClose = useCallback(() => {
    reset()
    setIsOpen(false)
  }, [reset])

  const onSubmit = useCallback(
    async (data: CreateCarrouselItemFormData) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        // Valida se tem imagem
        if (!validateImageFile(data.thumbnailUrl)) {
          setIsSubmitting(false)
          return
        }

        // Faz upload da imagem
        const uploadResult = await uploadImage({
          file: data.thumbnailUrl![0],
          folder: 'courses/carrousel',
        })

        if (!uploadResult.success || !uploadResult.url) {
          setIsSubmitting(false)
          return
        }

        const thumbnailUrl = uploadResult.url

        const payload = {
          title: data.title,
          description: data.description,
          videoUrl: data.videoUrl,
          thumbnailUrl,
          ctaLabel: data.ctaLabel,
          ctaUrl: data.ctaUrl,
          order: data.order,
          isStream: data.isStream,
        }

        await createCarrouselItem.mutateAsync(payload)

        toaster.create({
          title: 'Item criado',
          description: 'O item do carrousel foi criado com sucesso.',
          type: 'success',
        })

        handleClose()
      } catch {
        toaster.create({
          title: 'Erro',
          description: 'Ocorreu um erro ao criar o item do carrousel.',
          type: 'error',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, createCarrouselItem, handleClose]
  )

  return (
    <>
      <Button
        colorScheme="blue"
        onClick={() => setIsOpen(true)}
        w={{ base: 'full', md: '200px' }}
      >
        <RiAddLine />
        Novo Item
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
              form="create-carrousel-item-form"
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
        title="Novo Item do Carrousel"
      >
        <form
          id="create-carrousel-item-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={6}>
            <Fieldset.Root>
              <Fieldset.Legend>Imagem de Capa</Fieldset.Legend>
              <Fieldset.Content>
                <FileUpload.Root
                  accept="image/*"
                  maxFiles={1}
                  {...register('thumbnailUrl')}
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
                  placeholder="Digite o título"
                  required
                  {...register('title', {
                    required: 'Título é obrigatório',
                  })}
                />
                <Textarea
                  control={control}
                  label="Descrição"
                  placeholder="Digite a descrição"
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
                  label="URL do Vídeo"
                  placeholder="https://youtube.com/watch?v=..."
                  type="url"
                  {...register('videoUrl')}
                />
              </Fieldset.Content>
            </Fieldset.Root>

            <Fieldset.Root>
              <Fieldset.Content>
                <Input
                  control={control}
                  label="Label do CTA"
                  placeholder="Ex: Acessar agora"
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
                <Field.Root
                  disabled
                  required
                >
                  <Field.Label>
                    Ordem
                    <Field.RequiredIndicator />
                  </Field.Label>
                  <Input
                    control={control}
                    disabled
                    type="number"
                    value={nextAvailableOrder}
                    {...register('order')}
                  />
                  <Field.HelperText>
                    Novo item será adicionado na posição {nextAvailableOrder}
                  </Field.HelperText>
                </Field.Root>
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

export { CreateCarrouselItemForm, type CreateCarrouselItemFormProps }
