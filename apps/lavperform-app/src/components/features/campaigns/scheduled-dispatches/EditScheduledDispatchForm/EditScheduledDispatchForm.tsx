import {
  Alert,
  AlertRootProps,
  Box,
  Button,
  Card,
  createListCollection,
  Fieldset,
  FileUpload,
  Flex,
  HStack,
  Icon,
  Image,
  RadioGroup,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LuTrash2, LuUpload } from 'react-icons/lu'
import { RiSaveLine } from 'react-icons/ri'

import {
  AudienceSelect,
  CustomDrawer,
  CustomSendListSelect,
  DeleteConfirmationDialog,
  FileUploadList,
  Input,
  SegmentationSelect,
  Textarea,
  toaster,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { scheduledDispatchCampaignService } from '@/services'
import { resolveCampaignTargetingFromApi } from '@/utils/campaigns/resolveCampaignTargetingFromApi'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { convertISOToDateTime } from '@/utils/convertISOToDate'
import { logger } from '@/utils/logger'
import { uploadImage } from '@/utils/upload'

import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_IN_MB,
} from '../ScheduledDispatchList/constants'
import { Props } from './EditScheduledDispatchForm.types'
import { FormData, schema } from './schema'

const EditScheduledDispatchFormComponent = ({ onClose, data }: Props) => {
  const queryClient = useQueryClient()
  const targeting = resolveCampaignTargetingFromApi(data)

  const {
    register,
    formState: { isSubmitting },
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      name: '',
      scheduledDate: undefined,
      messageText: '',
      segmentation: [],
      targetingMode: 'RFV',
      audienceId: undefined,
      customSendListId: undefined,
      imageUrl: '',
      modifiedByAI: true,
    },
    values: {
      ...data,
      targetingMode: targeting.targetingMode,
      audienceId: targeting.audienceId ?? undefined,
      customSendListId: targeting.customSendListId ?? undefined,
      segmentation: targeting.segmentation,
      scheduledDate: convertISOToDateTime(data.scheduledDate),
    },
  })

  const targetingModeValue = watch('targetingMode')

  const [isOpen, setIsOpen] = useState(!!data)

  const [isDeleting, setIsDeleting] = useState(false)

  const { selectedCompany } = useAuth()

  const handleSave = async (values: any) => {
    if (!selectedCompany) return null

    try {
      if (values.newImageUrl) {
        const file = values.newImageUrl[0] as File

        const uploadResult = await uploadImage({
          file,
          folder: 'campaigns',
        })

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(
            uploadResult.error ||
              'Falha ao fazer upload da imagem. Tente novamente.'
          )
        }

        logger.info('Imagem carregada com sucesso:', uploadResult.url)

        values = {
          ...values,
          imageUrl: uploadResult.url,
        }
      }

      values = {
        ...values,
        targetingMode: values.targetingMode ?? 'RFV',
        ...(values.targetingMode === 'AUDIENCE'
          ? { audienceId: values.audienceId }
          : values.targetingMode === 'CUSTOMER_LIST'
            ? { customSendListId: values.customSendListId }
            : { segmentation: (values.segmentation ?? []).join(', ') }),
      }

      const response = await scheduledDispatchCampaignService.updateCampaign(
        selectedCompany.id,
        data.id,
        values
      )

      // Invalida todas as queries de campanhas de fidelidade para atualizar a lista
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.all,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.data.message || 'Disparo editado com sucesso!',
        type: 'success',
        closable: true,
        duration: 2000,
      })

      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível editar o disparo.'

      toaster.dismiss() // Remove qualquer toast de loading

      toaster.create({
        title: 'Editar disparo',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  const handleClose = () => {
    setTimeout(() => {
      onClose()

      reset()

      setIsOpen(false)
    }, 500)
  }

  const handleRemove = async () => {
    setIsDeleting(true)
    try {
      if (!selectedCompany) return

      await scheduledDispatchCampaignService.deleteCampaign(
        selectedCompany.id,
        data.id
      )

      // Invalida todas as queries de campanhas de fidelidade para atualizar a lista
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.all,
      })

      toaster.create({
        title: 'Sucesso',
        description: 'Disparo excluído com sucesso!',
        type: 'success',
        closable: true,
        duration: 2000,
      })

      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível excluir o disparo.'

      toaster.create({
        title: 'Excluir disparo',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const avalableEditing = useMemo(() => {
    return data.status === 'WAITING'
  }, [data])

  const statusMessage = createListCollection({
    items: [
      {
        type: 'COMPLETED',
        status: 'success',
        description: 'Disparo realizado com sucesso.',
      },
      {
        type: 'PROCESSING',
        status: 'warning',
        description: 'Disparo em andamento.',
      },
      {
        type: 'FAILED',
        status: 'error',
        description: 'Disparo realizado com falha.',
      },
      {
        type: 'WAITING',
        status: 'warning',
        description: (
          <p>
            Para que todas as informações da sua imagem sejam exibidas na
            mensagem, sugerimos que a resolução da imagem seja de{' '}
            <strong>1080x1080</strong> ou proporcional.
          </p>
        ),
      },
    ],
  })

  return (
    <CustomDrawer
      closeTrigger
      footer={
        avalableEditing && (
          <>
            <DeleteConfirmationDialog
              isLoading={isDeleting}
              onClick={handleRemove}
              title="Deseja excluir o disparo?"
              trigger={
                <Button
                  colorPalette={'red'}
                  loading={isDeleting}
                  loadingText="Deletando disparo..."
                  variant={'outline'}
                >
                  <LuTrash2 />
                  Deletar
                </Button>
              }
            />
            <Button
              form="hook-form"
              loading={isSubmitting}
              loadingText="Editando disparo..."
              type="submit"
            >
              <RiSaveLine />
              Editar disparo
            </Button>
          </>
        )
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      title="Detalhes do disparo"
    >
      <Stack
        as="form"
        gap={6}
        id="hook-form"
        onSubmit={handleSubmit(handleSave)}
      >
        <Fieldset.Root disabled={!avalableEditing}>
          <Fieldset.Content>
            {statusMessage.items.map((status, index) => {
              return (
                <Alert.Root
                  hidden={status.type !== data.status}
                  key={index}
                  status={status.status as AlertRootProps}
                  variant="surface"
                >
                  <Alert.Indicator />
                  <Alert.Title>{status.description}</Alert.Title>
                </Alert.Root>
              )
            })}
            <FileUpload.Root
              accept="image/jpeg, image/png"
              alignItems="stretch"
              maxFileSize={MAX_FILE_SIZE_IN_MB}
              maxFiles={1}
              preventDocumentDrop
              {...register('newImageUrl')}
            >
              <FileUpload.HiddenInput />
              {avalableEditing && (
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
              )}
              <Flex gap={4}>
                <Box>
                  <Text mb="2">Imagem atual</Text>
                  <Card.Root>
                    <Card.Body p="2">
                      <Image
                        maxH="100px"
                        maxW="100px"
                        objectFit="contain"
                        src={data.imageUrl}
                      />
                    </Card.Body>
                  </Card.Root>
                </Box>
                <Box flex={1}>
                  <FileUploadList title="Nova imagem" />
                </Box>
              </Flex>
            </FileUpload.Root>
            <Input
              control={control}
              label="Título do Disparo"
              placeholder="Informe o título do disparo"
              required
              {...register('name')}
            />
            <Input
              control={control}
              label="Data do Envio"
              required
              type="datetime-local"
              {...register('scheduledDate')}
            />
            <Textarea
              control={control}
              label="Mensagem"
              placeholder="Digite a mensagem da campanha"
              required
              resize="vertical"
              rows={4}
              {...register('messageText')}
            />
            <Controller
              control={control}
              name="targetingMode"
              render={({ field }) => (
                <RadioGroup.Root
                  onValueChange={({ value }) => {
                    field.onChange(value)
                    if (value === 'AUDIENCE') {
                      setValue('segmentation', [], { shouldValidate: true })
                      setValue('customSendListId', undefined, { shouldValidate: true })
                    } else if (value === 'CUSTOMER_LIST') {
                      setValue('segmentation', [], { shouldValidate: true })
                      setValue('audienceId', undefined, { shouldValidate: true })
                    } else {
                      setValue('audienceId', undefined, { shouldValidate: true })
                      setValue('customSendListId', undefined, { shouldValidate: true })
                    }
                  }}
                  value={field.value}
                >
                  <HStack gap={6} wrap="wrap">
                    <RadioGroup.Item value="RFV">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>Segmentação RFV</RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="AUDIENCE">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>Audiência customizada</RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="CUSTOMER_LIST">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>Lista personalizada</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  </HStack>
                </RadioGroup.Root>
              )}
            />
            {targetingModeValue === 'RFV' ? (
              <SegmentationSelect
                collection={clientTypesOptions}
                control={control}
                label="Segmentação"
                multiple
                name="segmentation"
                placeholder="Selecione os tipos de clientes"
                required
              />
            ) : targetingModeValue === 'AUDIENCE' ? (
              <AudienceSelect
                control={control}
                label="Audiência"
                name="audienceId"
                required
              />
            ) : (
              <CustomSendListSelect
                control={control}
                label="Lista personalizada"
                name="customSendListId"
                required
              />
            )}
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}

const EditScheduledDispatchForm = memo(
  EditScheduledDispatchFormComponent
) as typeof EditScheduledDispatchFormComponent

export {
  EditScheduledDispatchForm,
  type Props as EditScheduledDispatchFormProps,
}
