import {
  Badge,
  Box,
  Button,
  Card,
  Float,
  Grid,
  GridItem,
  HStack,
  Icon,
  Image,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { LuUpload, LuX } from 'react-icons/lu'

import { Input } from '@/components/forms'

import { uploadImage } from '@/utils/upload'

import type { BrandingData } from '@/whitelabel/types'

import { BrandPreviewCard } from './BrandPreviewCard/BrandPreviewCard'
import { ColorPalettePicker } from './ColorPalettePicker'
import { Props } from './BrandingForm.types'

function BrandingFormBase({ data, onChange }: Props) {
  const { control, watch, setValue } = useForm({
    defaultValues: {
      name: data.name || '',
      slogan: data.slogan || '',
      logo: data.logo || '',
      primaryColor: data.primaryColor || '',
      secondaryColor: data.secondaryColor || '',
      tertiaryColor: data.tertiaryColor || '',
    },
  })

  const [isUploading, setIsUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const watchedData = watch()
  // Usa useWatch para observar campos de cor individualmente - mais confiável que watch()
  const primaryColor = useWatch({ control, name: 'primaryColor' }) as string | undefined
  const secondaryColor = useWatch({ control, name: 'secondaryColor' }) as string | undefined
  const tertiaryColor = useWatch({ control, name: 'tertiaryColor' }) as string | undefined
  const onChangeRef = useRef(onChange)
  const previousDataRef = useRef<string>('')

  // Atualizar ref sempre que onChange mudar
  onChangeRef.current = onChange

  // Handler de upload do logo
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    setIsUploading(true)
    
    try {
      const result = await uploadImage({
        file,
        folder: 'landing-page/branding',
      })
      
      if (result.success && result.url) {
        setValue('logo', result.url)
      }
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error)
    } finally {
      setIsUploading(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
    }
  }

  useEffect(() => {
    // objeto final no formato BrandingData para o onChange
    const { primaryColor: _, secondaryColor: __, tertiaryColor: ___, ...restData } = watchedData

    const formDataWithColors: BrandingData = {
      name: restData.name ?? '',
      slogan: restData.slogan ?? '',
      logo: restData.logo ?? '',
    }

    if (primaryColor != null && typeof primaryColor === 'string' && primaryColor.trim() !== '') {
      formDataWithColors.primaryColor = primaryColor.trim()
    }
    if (secondaryColor != null && typeof secondaryColor === 'string' && secondaryColor.trim() !== '') {
      formDataWithColors.secondaryColor = secondaryColor.trim()
    }
    if (tertiaryColor != null && typeof tertiaryColor === 'string' && tertiaryColor.trim() !== '') {
      formDataWithColors.tertiaryColor = tertiaryColor.trim()
    }

    const currentDataString = JSON.stringify(formDataWithColors)
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(formDataWithColors)
    }
  }, [watchedData, primaryColor, secondaryColor, tertiaryColor, control])



  const brandName = watch('name')
  const brandSlogan = watch('slogan')
  const brandLogo = watch('logo')

  return (
    <Grid
      gap={6}
      templateColumns={{ base: '1fr', lg: '400px 1fr' }}
    >
      <GridItem
        order={{ base: 1, lg: 1 }}
        position={{ base: 'relative', lg: 'sticky' }}
        top={{ lg: 0 }}
        alignSelf={{ lg: 'flex-start' }}
        bg={{ lg: 'bg.canvas' }}
        py={{ lg: 1 }}
      >
        <Stack gap={6}>
          <BrandPreviewCard
            logo={brandLogo}
            name={brandName || ''}
            slogan={brandSlogan}
          />
          <ColorPalettePicker
            control={control}
            primaryColorName="primaryColor"
            secondaryColorName="secondaryColor"
            tertiaryColorName="tertiaryColor"
          />
        </Stack>
      </GridItem>

      <GridItem order={{ base: 2, lg: 2 }}>
        <Card.Root variant="elevated">
          <Card.Header>
            <Card.Title>Informações da Marca</Card.Title>
            <Card.Description>
              Essas informações aparecem no topo da sua Landing Page e definem a
              primeira impressão dos seus visitantes.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              {/* Nome da Marca */}
              <Stack gap={2}>
                <Input
                  control={control}
                  label="Nome da marca"
                  name="name"
                  placeholder="Digite o nome da marca"
                  required
                />
                <HStack gap={2}>
                  <Badge
                    colorPalette="blue"
                    variant="subtle"
                  >
                    Obrigatório
                  </Badge>
                  <Badge
                    colorPalette="green"
                    variant="subtle"
                  >
                    Visível na Landing Page
                  </Badge>
                </HStack>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Esse nome aparece no topo da sua Landing Page
                </Text>
              </Stack>

              <Separator />

              {/* Slogan */}
              <Stack gap={2}>
                <Input
                  control={control}
                  label="Slogan"
                  name="slogan"
                  placeholder="Digite o slogan"
                />
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Aparece logo abaixo do nome da marca (opcional)
                </Text>
              </Stack>

              <Separator />

              {/* Upload de Logo */}
              <Stack gap={2}>
                <Box>
                  {/* Preview da imagem existente */}
                  {watch('logo') && typeof watch('logo') === 'string' && (
                    <Box
                      alignItems="center"
                      borderColor="border.muted"
                      borderRadius="lg"
                      borderWidth="1px"
                      display="flex"
                      h="160px"
                      justifyContent="center"
                      mb={3}
                      position="relative"
                      w="160px"
                    >
                      <Image
                        alt="Logo"
                        h="120px"
                        objectFit="contain"
                        src={watch('logo')}
                        w="120px"
                      />
                      <Float
                        offsetX="-4px"
                        offsetY="4px"
                        placement="top-end"
                      >
                        <Button
                          colorPalette="red"
                          onClick={() => setValue('logo', '')}
                          size="xs"
                          variant="solid"
                          zIndex={10}
                        >
                          <LuX />
                        </Button>
                      </Float>
                    </Box>
                  )}

                  {/* Input de upload */}
                  <input
                    accept="image/*"
                    onChange={handleLogoUpload}
                    ref={logoInputRef}
                    style={{ display: 'none' }}
                    type="file"
                  />
                  <Box
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
                    gap={3}
                    justifyContent="center"
                    onClick={() => logoInputRef.current?.click()}
                    py={8}
                    w="full"
                  >
                    <Icon
                      color="fg.muted"
                      size="xl"
                    >
                      <LuUpload />
                    </Icon>
                    <Stack
                      gap={1}
                      textAlign="center"
                    >
                      <Text fontWeight="medium">
                        {isUploading 
                          ? 'Enviando logo...' 
                          : 'Arraste seu logo ou clique para enviar'}
                      </Text>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                      >
                        PNG ou JPG • até 5MB
                      </Text>
                    </Stack>
                  </Box>
                </Box>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Seu logo será exibido no topo da Landing Page junto com o nome
                  da marca
                </Text>
              </Stack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </GridItem>
    </Grid>
  )
}

const BrandingForm = memo(BrandingFormBase) as typeof BrandingFormBase

export { BrandingForm, type Props as BrandingFormProps }
