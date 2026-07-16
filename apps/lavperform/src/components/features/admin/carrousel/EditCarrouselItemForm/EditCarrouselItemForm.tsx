import {
  Alert,
  Box,
  Button,
  createListCollection,
  Field,
  Fieldset,
  FileUpload,
  Icon,
  Image,
  Select,
  Stack,
  Switch,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useDeleteCarrouselItem, useUpdateCarrouselItem } from '@/hooks/queries'
import type { CarrouselItem } from '@/types'
import { MAX_FILE_SIZE } from '@/utils/constants/upload'
import { uploadImage } from '@/utils/upload'

import type {
  EditCarrouselItemFormData,
  EditCarrouselItemFormProps,
} from './EditCarrouselItemForm.types'

function EditCarrouselItemForm({
  isOpen,
  onClose,
  item,
  allItems,
}: EditCarrouselItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateCarrouselItem = useUpdateCarrouselItem()
  const deleteCarrouselItem = useDeleteCarrouselItem()

  const { register, handleSubmit, control, reset, watch } =
    useForm<EditCarrouselItemFormData>({
      defaultValues: {
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: null,
        ctaLabel: '',
        ctaUrl: '',
        order: 1,
        isStream: false,
      },
    })

  useEffect(() => {
    if (item && isOpen) {
      reset({
        title: item.title,
        description: item.description,
        videoUrl: item.videoUrl,
        thumbnailUrl: null,
        ctaLabel: item.ctaLabel,
        ctaUrl: item.ctaUrl,
        order: item.order,
        isStream: item.isStream,
      })
    }
  }, [item, isOpen, reset])

  // Gera as opções de ordem (1 até total + 1)
  const orderOptions = useMemo(() => {
    if (!allItems)
      return createListCollection({
        items: [{ value: '1', label: 'Posição 1' }],
      })
    const maxOrder = Math.max(...allItems.map((i) => i.order), 0)
    const options = []
    for (let i = 1; i <= maxOrder + 1; i++) {
      options.push({ value: String(i), label: `Posição ${i}` })
    }
    return createListCollection({
      items: options,
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value,
    })
  }, [allItems])

  // Observa a mudança na ordem
  const currentOrder = watch('order')

  // Calcula como ficará a ordem dos outros itens
  const itemsOrderPreview = useMemo(() => {
    if (!allItems || !currentOrder) return []

    const targetOrder = Number(currentOrder)
    const otherItems = allItems.filter((i) => i.id !== item?.id)

    // Ordena outros itens pela ordem atual
    const sortedOthers = [...otherItems].sort((a, b) => a.order - b.order)

    // Cria o item temporário
    const tempItem: CarrouselItem = {
      id: item?.id || 'temp',
      title: item?.title || 'Novo item',
      description: item?.description || '',
      videoUrl: item?.videoUrl || '',
      thumbnailUrl: item?.thumbnailUrl || '',
      ctaLabel: item?.ctaLabel || '',
      ctaUrl: item?.ctaUrl || '',
      order: targetOrder,
      isStream: item?.isStream || false,
      createdAt: item?.createdAt || '',
      updatedAt: item?.updatedAt || '',
    }

    // Insere o item na posição desejada (targetOrder - 1)
    const targetIndex = Math.max(
      0,
      Math.min(targetOrder - 1, sortedOthers.length)
    )
    sortedOthers.splice(targetIndex, 0, tempItem)

    // Renumera todos sequencialmente
    const renumbered = sortedOthers.map((itm, index) => ({
      ...itm,
      order: index + 1,
    }))

    // Retorna apenas os que mudaram (exceto o item atual) para preview
    return renumbered
      .filter((itm) => itm.id !== tempItem.id)
      .filter((itm) => {
        const original = allItems.find((o) => o.id === itm.id)
        return original && original.order !== itm.order
      })
      .slice(0, 5)
  }, [allItems, currentOrder, item])

  const onSubmit = useCallback(
    async (data: EditCarrouselItemFormData) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        let thumbnailUrl = item?.thumbnailUrl || ''

        // Se uma nova imagem foi selecionada, fazer upload
        if (data.thumbnailUrl && data.thumbnailUrl.length > 0) {
          const uploadResult = await uploadImage({
            file: data.thumbnailUrl[0],
            folder: 'courses/carrousel',
          })

          if (!uploadResult.success || !uploadResult.url) {
            setIsSubmitting(false)
            return
          }

          thumbnailUrl = uploadResult.url
        }

        // Se não tem URL de thumbnail, não continua
        if (!thumbnailUrl) {
          toaster.create({
            title: 'Imagem obrigatória',
            description: 'Por favor, selecione uma imagem.',
            type: 'error',
          })
          setIsSubmitting(false)
          return
        }

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

        // Ajusta a ordem dos outros itens se necessário
        const targetOrder = data.order
        const otherItems = allItems?.filter((i) => i.id !== item?.id) || []

        // Ordena outros itens pela ordem atual
        const sortedOthers = [...otherItems].sort((a, b) => a.order - b.order)

        // Cria o item temporário com todos os dados
        const tempItem: CarrouselItem = {
          id: item?.id || 'temp',
          title: payload.title,
          description: payload.description,
          videoUrl: payload.videoUrl || '',
          thumbnailUrl: payload.thumbnailUrl,
          ctaLabel: payload.ctaLabel,
          ctaUrl: payload.ctaUrl,
          order: targetOrder,
          isStream: payload.isStream,
          createdAt: item?.createdAt || '',
          updatedAt: item?.updatedAt || '',
        }

        // Insere o item na posição desejada (targetOrder - 1 no array)
        const targetIndex = Math.max(
          0,
          Math.min(targetOrder - 1, sortedOthers.length)
        )
        sortedOthers.splice(targetIndex, 0, tempItem)

        // Renumera todos sequencialmente (1, 2, 3, 4...)
        const itemsToUpdate: Array<{
          id: string
          item: any
          newOrder: number
        }> = []
        let finalOrderForCurrentItem = targetOrder

        sortedOthers.forEach((itm, index) => {
          const newOrder = index + 1

          // Armazena a ordem final do item atual
          if (itm.id === tempItem.id) {
            finalOrderForCurrentItem = newOrder
          }

          // Adiciona itens que precisam ser atualizados (exceto o atual)
          if (itm.id !== tempItem.id && itm.order !== newOrder) {
            itemsToUpdate.push({
              id: itm.id,
              item: itm,
              newOrder,
            })
          }
        })

        // Atualiza o payload com a ordem final correta
        const finalPayload = {
          ...payload,
          order: finalOrderForCurrentItem,
        }

        // Primeiro atualiza o item atual
        await updateCarrouselItem.mutateAsync({
          id: item.id,
          data: finalPayload,
        })

        // Depois atualiza os outros itens se necessário
        if (itemsToUpdate.length > 0) {
          await Promise.all(
            itemsToUpdate.map(({ id, item: itemToUpdate, newOrder }) => {
              return updateCarrouselItem.mutateAsync({
                id,
                data: {
                  ...itemToUpdate,
                  order: newOrder,
                },
              })
            })
          )
        }

        toaster.create({
          title: 'Item atualizado',
          description: 'O item do carrousel foi atualizado com sucesso.',
          type: 'success',
        })

        onClose()
      } catch {
        toaster.create({
          title: 'Erro',
          description: 'Ocorreu um erro ao salvar o item do carrousel.',
          type: 'error',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [item, isSubmitting, updateCarrouselItem, onClose, allItems]
  )

  const handleDelete = useCallback(async () => {
    if (!item) return

    try {
      await deleteCarrouselItem.mutateAsync(item.id)
      toaster.create({
        title: 'Item excluído',
        description: 'O item do carrousel foi excluído com sucesso.',
        type: 'success',
      })
      onClose()
    } catch {
      toaster.create({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir o item do carrousel.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [item, deleteCarrouselItem, onClose])

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
              isLoading={deleteCarrouselItem.isPending}
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
            form="edit-carrousel-item-form"
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
      title="Editar Item do Carrousel"
    >
      <form
        id="edit-carrousel-item-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Stack gap={6}>
          <Fieldset.Root>
            <Fieldset.Legend>Imagem de Capa</Fieldset.Legend>
            <Fieldset.Content>
              {item?.thumbnailUrl && (
                <Box mb={4}>
                  <Image
                    alt="Preview"
                    borderRadius="md"
                    maxH={200}
                    objectFit="cover"
                    src={item.thumbnailUrl}
                  />
                </Box>
              )}
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
              <Field.Root required>
                <Field.Label>
                  Ordem
                  <Field.RequiredIndicator />
                </Field.Label>
                <Controller
                  control={control}
                  name="order"
                  render={({ field }) => (
                    <Select.Root
                      collection={orderOptions}
                      name={field.name}
                      onValueChange={({ value }) => {
                        field.onChange(Number(value[0]))
                      }}
                      value={[String(field.value)]}
                    >
                      <Select.HiddenSelect />
                      <Select.Control>
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Select.IndicatorGroup>
                          <Select.Indicator />
                        </Select.IndicatorGroup>
                      </Select.Control>
                      <Select.Positioner>
                        <Select.Content>
                          {orderOptions.items.map((option) => (
                            <Select.Item
                              item={option}
                              key={option.value}
                            >
                              {option.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Select.Root>
                  )}
                />
              </Field.Root>
              {itemsOrderPreview.length > 0 && (
                <Alert.Root
                  mt={2}
                  size="sm"
                  status="info"
                  variant="surface"
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Ajuste automático de ordem</Alert.Title>
                    <Alert.Description>
                      Os seguintes itens terão sua ordem ajustada:
                      {itemsOrderPreview.map((previewItem) => (
                        <Box
                          as="div"
                          key={previewItem.id}
                          mt={1}
                        >
                          • {previewItem.title} → Ordem {previewItem.order}
                        </Box>
                      ))}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
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

export { EditCarrouselItemForm, type EditCarrouselItemFormProps }
