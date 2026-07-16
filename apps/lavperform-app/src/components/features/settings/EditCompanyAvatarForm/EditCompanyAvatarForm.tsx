import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  FileUpload,
  Flex,
  Icon,
  Image,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuUpload } from 'react-icons/lu'
import { RiEditLine, RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, FileUploadList, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { companyService } from '@/services'
import { logger } from '@/utils/logger'
import { uploadImage } from '@/utils/upload'

import { Props } from './EditCompanyAvatarForm.types'

function EditCompanyAvatarForm({ company, onClose, onSuccess }: Props) {
  const { selectedCompany, updateCompanyAvatar } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!selectedCompany || !avatarFile) {
      toaster.create({
        title: 'Atenção',
        description: 'Por favor, selecione uma imagem.',
        type: 'warning',
      })
      return
    }

    try {
      setIsSaving(true)

      // 1. Fazer upload da imagem para o Firebase
      const uploadResult = await uploadImage({
        file: avatarFile,
        folder: 'avatar',
      })

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Falha ao fazer upload da imagem')
      }

      // 2. Atualizar o avatar da empresa
      const response = await companyService.updateCompanyAvatar(
        selectedCompany.id,
        uploadResult.url
      )

      // 3. Atualizar o contexto de autenticação para refletir a mudança no header e selects
      updateCompanyAvatar(selectedCompany.id, uploadResult.url)

      toaster.create({
        title: 'Sucesso',
        description: response.data.message || 'Logo atualizada com sucesso!',
        type: 'success',
      })

      onSuccess()
      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível atualizar a logo.'

      logger.error('Erro ao atualizar logo:', error)

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleClose() {
    onClose()
    setAvatarFile(null)
    setIsOpen(false)
  }

  return (
    <CustomDrawer
      footer={
        <Button
          loading={isSaving}
          onClick={handleSave}
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      onOpenChange={(e) => setIsOpen(e.open)}
      title="Alterar logo da empresa"
      trigger={
        <VStack
          _hover={{
            opacity: 0.8,
            cursor: 'pointer',
          }}
          borderWidth={1}
          gap={2}
          p={2}
          transition="opacity 0.2s"
        >
          <Avatar.Root
            shape="rounded"
            size="2xl"
          >
            <Avatar.Image src={company.avatarUrl} />
            <Avatar.Fallback name={company.name} />
          </Avatar.Root>
          <Button size="xs">
            <Icon>
              <RiEditLine />
            </Icon>
            Editar
          </Button>
        </VStack>
      }
    >
      <Stack gap={6}>
        <Alert.Root
          borderRadius="md"
          status="warning"
          variant="surface"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              <strong>Atenção!</strong> Ao alterar a logo da empresa, ela será
              atualizada em todo o sistema, incluindo cabeçalhos e documentos
              gerados. Certifique-se de que a nova imagem esteja no formato
              adequado.{' '}
              <strong>
                Recomendamos o uso de imagens quadradas para melhor exibição
              </strong>
              .
            </Alert.Title>
          </Alert.Content>
        </Alert.Root>{' '}
        <FileUpload.Root
          accept="image/jpeg, image/png"
          alignItems="stretch"
          maxFiles={1}
          onFileChange={(details) => {
            const file = details.acceptedFiles[0]
            if (file) {
              setAvatarFile(file)
            }
          }}
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
              <Box color="fg.muted">.png, .jpg</Box>
            </FileUpload.DropzoneContent>
          </FileUpload.Dropzone>
          <Flex gap={4}>
            <Box>
              <Text mb="2">Logo atual</Text>
              <Card.Root>
                <Card.Body p="2">
                  <Image
                    alt={company.name}
                    maxH="100px"
                    maxW="100px"
                    objectFit="contain"
                    src={company.avatarUrl || undefined}
                  />
                </Card.Body>
              </Card.Root>
            </Box>
            <Box flex={1}>
              <FileUploadList title="Nova logo" />
            </Box>
          </Flex>
        </FileUpload.Root>
      </Stack>
    </CustomDrawer>
  )
}

export { EditCompanyAvatarForm, type Props as EditCompanyAvatarFormProps }
