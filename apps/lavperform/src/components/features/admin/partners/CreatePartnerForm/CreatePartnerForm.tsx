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
import { useHookFormMask } from 'use-mask-input'

import { CustomDrawer, FileUploadList, Input, toaster } from '@/components'
import { queryKeys } from '@/lib/react-query'
import { partnerService } from '@/services'
import { logger } from '@/utils/logger'
import { uploadImage } from '@/utils/upload'

import { Props } from './CreatePartnerForm.types'
import { FormData, MAX_FILE_SIZE, MAX_FILE_SIZE_IN_MB, schema } from './schema'

const CreatePartnerFormComponent = ({ onClose }: Props) => {
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
      email: '',
      phone: '',
      cnpj: '',
      avatarUrl: '',
    },
  })

  const maskedRegister = useHookFormMask(register)

  const [isOpen, setIsOpen] = useState(false)

  const handleSave = async (values: any) => {
    try {
      const file = values.avatarUrl[0] as File

      const uploadResult = await uploadImage({
        file,
        folder: 'partners',
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
        avatarUrl: uploadResult.url,
      }

      const response = await partnerService.createPartner(values)

      queryClient.invalidateQueries({
        queryKey: queryKeys.partners.all,
      })

      toaster.create({
        title: 'Sucesso',
        description:
          response.data.message || 'Parceiro adicionado com sucesso!',
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
        'Não foi possível adicionar o parceiro.'

      toaster.dismiss()

      toaster.create({
        title: 'Adicionar novo parceiro',
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
          loadingText="Criando parceiro..."
          type="submit"
        >
          <RiSaveLine />
          Criar parceiro
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      title="Adicionar novo parceiro"
      trigger={
        <Button
          onClick={() => setIsOpen(true)}
          w={{ base: 'full', md: 'auto' }}
        >
          <RiAddLine />
          Novo parceiro
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
              status="info"
              variant="surface"
            >
              <Alert.Indicator />
              <Alert.Title>
                Faça upload de uma imagem para o avatar do parceiro. Formatos
                aceitos: .png, .jpg até {MAX_FILE_SIZE}MB.
              </Alert.Title>
            </Alert.Root>
            <FileUpload.Root
              accept="image/jpeg, image/png"
              alignItems="stretch"
              maxFileSize={MAX_FILE_SIZE_IN_MB}
              maxFiles={1}
              preventDocumentDrop
              required
              {...register('avatarUrl')}
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
              label="Nome do Parceiro"
              placeholder="Informe o nome do parceiro"
              required
              {...register('name')}
            />
            <Input
              control={control}
              label="E-mail"
              placeholder="Informe o e-mail do parceiro"
              required
              type="email"
              {...register('email')}
            />
            <Input
              control={control}
              label="Telefone"
              placeholder="Informe o telefone do parceiro"
              required
              {...maskedRegister('phone', '(99) 99999-9999')}
            />
            <Input
              control={control}
              label="CNPJ"
              placeholder="Informe o CNPJ do parceiro"
              required
              {...maskedRegister('cnpj', '99.999.999/9999-99')}
            />
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}

const CreatePartnerForm = memo(
  CreatePartnerFormComponent
) as typeof CreatePartnerFormComponent

export { CreatePartnerForm, type Props as CreatePartnerFormProps }
