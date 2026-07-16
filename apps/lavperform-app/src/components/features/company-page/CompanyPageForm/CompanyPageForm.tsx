import {
  Alert,
  Box,
  Button,
  Card,
  Fieldset,
  FileUpload,
  Flex,
  Heading,
  Icon,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useState } from 'react'
import { Controller, Resolver, useFieldArray, useForm } from 'react-hook-form'
import { FiLink } from 'react-icons/fi'
import { LuTrash2, LuUpload } from 'react-icons/lu'
import { MdAddCircleOutline } from 'react-icons/md'
import { RiSaveLine } from 'react-icons/ri'

import { FileUploadList, Input, Textarea, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCompanyPage } from '@/hooks/useCompanyPage'
import { organizationPageService } from '@/services'
import { logger } from '@/utils/logger'
import { uploadImage } from '@/utils/upload'

import { FormData, schema } from './schema'

// const colorOptions = createListCollection({
//   items: [
//     { label: 'Amarelo', value: 'yellow.400' },
//     { label: 'Branco', value: 'white' },
//     { label: 'Preto', value: 'black' },
//   ],
// })

function CompanyPageForm() {
  const { selectedCompany } = useAuth()
  const { updateData } = useCompanyPage()

  const [formValues, setFormValues] = useState<FormData>({
    bgColor: '',
    biography: '',
    coverImage: '',
    whatsappMessage: '',
    links: [],
    galleries: [],
  })

  // Estado para rastrear os arquivos reais dos ícones dos links
  const [linkIconFiles, setLinkIconFiles] = useState<Record<number, File>>({})
  // Estado para armazenar o arquivo da nova imagem de capa
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await organizationPageService.getBySlug(
          selectedCompany?.slug || ''
        )

        if (!response) {
          return
        }

        const companyFormated = {
          ...response,
          ...response.linkPages?.[0],
        }

        setFormValues({
          bgColor: companyFormated.bgColor || '',
          biography: companyFormated.biography || '',
          coverImage: companyFormated.coverImage || '',
          whatsappMessage: companyFormated.whatsappMessage || '',
          links: companyFormated.links || [],
          galleries: companyFormated.galleries || [],
        })
      } catch (error) {
        console.error('❌ Erro ao buscar dados da página:', error)
      }
    }
    fetchData()
  }, [selectedCompany])

  const {
    register,
    formState: { isSubmitting },
    control,
    handleSubmit,
    watch,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver(schema) as unknown as Resolver<FormData, any>,
    values: formValues,
  })

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control,
    name: 'links',
    keyName: '_id',
  })

  const addLink = () => {
    appendLink({
      label: '',
      url: '',
      icon: '',
      iconType: 'icon',
    })
  }

  const handleRemoveLink = async (id: string, index: number) => {
    // Se o link tem ID, significa que já está salvo no banco e precisa ser deletado via API
    if (id) {
      try {
        await organizationPageService.deleteLink(id)

        toaster.create({
          title: 'Link removido',
          description: 'O link foi removido com sucesso.',
          type: 'success',
          closable: true,
          duration: 2000,
        })
      } catch (error) {
        console.error('❌ Erro ao remover link:', error)

        toaster.create({
          title: 'Erro ao remover link',
          description: 'Não foi possível remover o link. Tente novamente.',
          type: 'error',
          closable: true,
          duration: 4000,
        })

        return // Não remove do array se a API falhar
      }
    }

    // Remove do array local
    removeLink(index)
  }

  useEffect(() => {
    const subscription = watch((data) => {
      updateData(data as any)
    })

    return () => subscription.unsubscribe()
  }, [watch, updateData])

  const handleSave = async (values: FormData) => {
    try {
      let payload = {
        ...values,
        slug: selectedCompany?.slug,
        companyId: selectedCompany?.id,
      }

      // Upload da imagem de capa
      if (coverImageFile) {
        const uploadResult = await uploadImage({
          file: coverImageFile,
          folder: 'campaigns',
        })

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(
            uploadResult.error ||
              'Falha ao fazer upload da imagem. Tente novamente.'
          )
        }

        logger.info('Imagem carregada com sucesso:', uploadResult.url)

        payload = {
          ...payload,
          coverImage: uploadResult.url,
        }
      }

      // Upload dos ícones dos links
      if (payload.links && payload.links.length > 0) {
        const linksWithUploadedIcons = await Promise.all(
          payload.links.map(async (link, index) => {
            const iconFile = linkIconFiles[index]

            // Preserva o ID do link se ele já existir
            const linkId = (link as any).id

            // Se existe um arquivo novo para este link
            if (iconFile) {
              toaster.create({
                title: `Fazendo upload do ícone do link ${index + 1}...`,
                description: 'Por favor, aguarde.',
                type: 'info',
              })

              const uploadResult = await uploadImage({
                file: iconFile,
                folder: 'link-icons',
              })

              if (!uploadResult.success || !uploadResult.url) {
                throw new Error(
                  uploadResult.error ||
                    `Falha ao fazer upload do ícone do link ${index + 1}.`
                )
              }

              logger.info(
                `Ícone do link ${index + 1} carregado com sucesso:`,
                uploadResult.url
              )

              return {
                ...link,
                id: linkId,
                icon: uploadResult.url,
              }
            }

            // Se não há arquivo novo, mantém o ícone existente e o ID
            return {
              ...link,
              id: linkId,
            }
          })
        )

        payload = {
          ...payload,
          links: linksWithUploadedIcons,
        }
      }

      const response = await organizationPageService.createOrUpdate(payload)

      // O backend não retorna os dados atualizados, então precisamos buscá-los novamente
      const updatedData = await organizationPageService.getBySlug(
        selectedCompany?.slug || ''
      )

      if (updatedData) {
        const companyFormated = {
          ...updatedData,
          ...updatedData.linkPages?.[0],
        }

        setFormValues({
          bgColor: companyFormated.bgColor || '',
          biography: companyFormated.biography || '',
          coverImage: companyFormated.coverImage || '',
          whatsappMessage: companyFormated.whatsappMessage || '',
          links: companyFormated.links || [],
          galleries: companyFormated.galleries || [],
        })

        // Limpa os arquivos de ícones pendentes após o salvamento
        setLinkIconFiles({})
        setCoverImageFile(null)
      }

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Minha página adicionada com sucesso!',
        type: 'success',
        closable: true,
        duration: 2000,
      })
    } catch (error: unknown) {
      console.error('❌ Erro ao salvar dados da página:', error)
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível adicionar a minha página.'

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  return (
    <Card.Root
      flexGrow={1}
      flexShrink={1}
      size={'sm'}
      w="full"
    >
      <Card.Body>
        <Stack
          as="form"
          gap={6}
          id="hook-form"
          onSubmit={handleSubmit(handleSave)}
        >
          <Fieldset.Root>
            <Fieldset.Content>
              <Heading>Dados editáveis:</Heading>
              <FileUpload.Root
                accept="image/jpeg, image/png"
                alignItems="stretch"
                maxFiles={1}
                onFileChange={(details) => {
                  const file = details.acceptedFiles[0]
                  if (file) {
                    setCoverImageFile(file)
                    const previewUrl = URL.createObjectURL(file)
                    updateData({ coverImage: previewUrl })
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
                    <Text mb="2">Imagem atual</Text>
                    <Card.Root>
                      <Card.Body p="2">
                        <Image
                          maxH="100px"
                          maxW="100px"
                          objectFit="contain"
                          src={watch('coverImage') || undefined}
                        />
                      </Card.Body>
                    </Card.Root>
                  </Box>
                  <Box flex={1}>
                    <FileUploadList title="Nova imagem" />
                  </Box>
                </Flex>
              </FileUpload.Root>

              <Textarea
                control={control}
                label="Descrição do estabelecimento"
                placeholder="Informe a descrição do seu estabelecimento (tipo, o que oferece, público-alvo, e diferenciais)"
                required
                rows={4}
                {...register('biography')}
              />
              <Input
                control={control}
                label="Mensagem do WhatsApp"
                placeholder="Informe a mensagem padrão do WhatsApp no primeiro contato"
                required
                {...register('whatsappMessage')}
              />
              {/* 
              TODO: Habilitar seleção de cor de fundo futuramente
              <Controller
                control={control}
                name="bgColor"
                render={({ field, fieldState: { error } }) => (
                  <Field.Root
                    invalid={!!error}
                    required
                  >
                    <Select.Root
                      collection={colorOptions}
                      onValueChange={(details: any) => {
                        const newColor = Array.isArray(details?.value)
                          ? details.value[0]
                          : details?.value
                        field.onChange(newColor)
                      }}
                      value={[field.value]}
                    >
                      <Select.HiddenSelect />
                      <Select.Label>Selecione sua cor de fundo</Select.Label>
                      <Select.Control>
                        <Select.Trigger justifyContent={'flex-start'}>
                          <Box
                            bg={watch('bgColor')}
                            borderRadius="full"
                            borderWidth={1}
                            boxSize={4}
                          />
                          <Select.ValueText placeholder="Selecione a cor" />
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Trigger>
                      </Select.Control>
                      <Portal>
                        <Select.Positioner>
                          <Select.Content>
                            {colorOptions.items.map((item) => (
                              <Select.Item
                                item={item}
                                key={item.value}
                              >
                                <Center gap={2}>
                                  <Box
                                    bg={item.value}
                                    borderRadius="full"
                                    borderWidth={1}
                                    boxSize={4}
                                  />
                                  <Text>{item.label}</Text>
                                </Center>
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                    <Field.ErrorText>{error?.message}</Field.ErrorText>
                  </Field.Root>
                )}
              /> */}
            </Fieldset.Content>
          </Fieldset.Root>
          <Heading size="md">Links de redirecionamento:</Heading>
          <Alert.Root
            borderRadius="md"
            status="warning"
            variant="surface"
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title fontWeight="bold">Dica importante</Alert.Title>
              <Alert.Description>
                É recomendado realizar o upload de imagens{' '}
                <b>sem fundo (formato PNG)</b> para melhor visualização dos
                ícones na página final.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
          <Button
            disabled={linkFields.length >= 3}
            onClick={addLink}
            variant="outline"
          >
            <Icon as={MdAddCircleOutline} /> Adicionar link
          </Button>
          {linkFields.map((field, index) => (
            <Card.Root
              bg={'bg'}
              key={field._id}
              size={'sm'}
              w="full"
            >
              <Card.Header>
                <Card.Title>Link {index + 1}</Card.Title>
              </Card.Header>
              <Card.Body gap={4}>
                <Controller
                  control={control}
                  name={`links.${index}.icon`}
                  render={({ field: iconField }) => (
                    <FileUpload.Root
                      accept="image/png, image/jpeg"
                      onFileChange={(details) => {
                        const file = details.acceptedFiles[0]
                        if (file) {
                          // Armazena o arquivo real para upload posterior
                          setLinkIconFiles((prev) => ({
                            ...prev,
                            [index]: file,
                          }))
                          // Atualiza o preview
                          iconField.onChange(URL.createObjectURL(file))
                        }
                      }}
                    >
                      <FileUpload.HiddenInput />
                      <FileUpload.Trigger asChild>
                        <Button
                          h="60px"
                          p={1}
                          variant={'outline'}
                          w="60px"
                        >
                          {iconField.value ? (
                            <Image
                              alt="ícone"
                              objectFit="contain"
                              src={iconField.value || undefined}
                            />
                          ) : (
                            <FiLink />
                          )}
                        </Button>
                      </FileUpload.Trigger>
                    </FileUpload.Root>
                  )}
                />
                <Input
                  control={control}
                  label="Título"
                  placeholder="(ex: Ifood, Site, Delivery)"
                  required
                  {...register(`links.${index}.label`)}
                />
                <Input
                  control={control}
                  label="Link"
                  placeholder="https://..."
                  required
                  {...register(`links.${index}.url`)}
                />
              </Card.Body>
              <Card.Footer>
                <Button
                  aria-label="Remover link"
                  colorPalette="red"
                  onClick={() => handleRemoveLink((field as any).id, index)}
                  size="2xs"
                  variant="surface"
                >
                  <LuTrash2 /> Remover link
                </Button>
              </Card.Footer>
            </Card.Root>
          ))}
        </Stack>
      </Card.Body>
      <Card.Footer>
        <Button
          form="hook-form"
          loading={isSubmitting}
          type="submit"
          w="full"
        >
          <RiSaveLine /> Salvar minha página
        </Button>
      </Card.Footer>
    </Card.Root>
  )
}

export { CompanyPageForm }
