import {
  Alert,
  Box,
  Button,
  Fieldset,
  FileUpload,
  HStack,
  Icon,
  RadioGroup,
  Stack,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import {
  AudienceSelect,
  CustomDrawer,
  CustomSendListSelect,
  FileUploadList,
  Input,
  SegmentationSelect,
  Textarea,
  toaster,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { scheduledDispatchCampaignService } from '@/services'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { logger } from '@/utils/logger'
import { uploadImage } from '@/utils/upload'

import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_IN_MB,
} from '../ScheduledDispatchList/constants'
import { Props } from './CreateScheduledDispatchForm.types'
import { FormData, schema } from './schema'

const CreateScheduledDispatchFormComponent = ({ onClose }: Props) => {
  const queryClient = useQueryClient()

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
  })

  const targetingModeValue = watch('targetingMode')

  const { selectedCompany } = useAuth()

  const [isOpen, setIsOpen] = useState(false)

  const handleSave = async (values: any) => {
    if (!selectedCompany) return null

    try {
      const file = values.imageUrl[0] as File

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

      const date = new Date(values.scheduledDate)

      date.setHours(date.getHours() - 3)

      values = {
        ...values,
        imageUrl: uploadResult.url,
        scheduledDate: date,
        modifiedByAI: true,
        targetingMode: values.targetingMode ?? 'RFV',
        ...(values.targetingMode === 'AUDIENCE'
          ? { audienceId: values.audienceId }
          : values.targetingMode === 'CUSTOMER_LIST'
            ? { customSendListId: values.customSendListId }
            : { segmentation: values.segmentation.join(', ') }),
      }

      const response = await scheduledDispatchCampaignService.createCampaign(
        selectedCompany.id,
        values
      )

      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.all,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.data.message || 'Disparo adicionado com sucesso!',
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
        'Não foi possível adicionar o disparo.'

      toaster.dismiss()

      toaster.create({
        title: 'Adicionar novo disparo',
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
    }, 1000)
  }

  return (
    <CustomDrawer
      closeTrigger
      footer={
        <Button
          form="hook-form"
          loading={isSubmitting}
          loadingText="Criando disparo..."
          type="submit"
        >
          <RiSaveLine />
          Criar disparo
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      title="Adicionar novo disparo"
      trigger={
        <Button
          onClick={() => setIsOpen(true)}
          w={{ base: 'full', md: 'auto' }}
        >
          <RiAddLine />
          Novo disparo
        </Button>
      }
    >
      <Stack
        as="form"
        gap={6}
        id="hook-form"
        onSubmit={handleSubmit(handleSave)}
      >
        <Fieldset.Root>
          <Fieldset.Content>
            <Alert.Root
              status="warning"
              variant="surface"
            >
              <Alert.Indicator />
              <Alert.Title>
                Para que todas as informações da sua imagem sejam exibidas na
                mensagem, sugerimos que a resolução da imagem seja de{' '}
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

const CreateScheduledDispatchForm = memo(
  CreateScheduledDispatchFormComponent
) as typeof CreateScheduledDispatchFormComponent

export {
  CreateScheduledDispatchForm,
  type Props as CreateScheduledDispatchFormProps,
}
