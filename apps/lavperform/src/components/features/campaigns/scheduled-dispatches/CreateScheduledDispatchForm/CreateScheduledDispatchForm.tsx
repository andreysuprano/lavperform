import {
  Alert,
  Box,
  Button,
  Fieldset,
  FileUpload,
  Icon,
  Stack,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import {
  CustomDrawer,
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
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {
      name: '',
      scheduledDate: undefined,
      messageText: '',
      segmentation: [],
      imageUrl: '',
      modifiedByAI: true,
    },
  })

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
        segmentation: values.segmentation.join(', '),
        scheduledDate: date,
        modifiedByAI: true,
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
            <SegmentationSelect
              collection={clientTypesOptions}
              control={control}
              label="Segmentação"
              multiple
              name="segmentation"
              placeholder="Selecione os tipos de clientes"
              required
            />
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
