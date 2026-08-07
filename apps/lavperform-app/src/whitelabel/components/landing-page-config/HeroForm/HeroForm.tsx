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
import { useForm } from 'react-hook-form'
import {
  LuClock,
  LuCreditCard,
  LuUpload,
  LuX,
} from 'react-icons/lu'

import { Input } from '@/components/forms'

import { uploadImage } from '@/utils/upload'

import { HeroPreviewCard } from './HeroPreviewCard/HeroPreviewCard'
import { Props } from './HeroForm.types'

function HeroFormBase({ data, onChange, branding }: Props) {
  const { control, watch, setValue } = useForm({
    defaultValues: {
      ...data,
      backgroundImage: data.backgroundImage || '',
    },
  })

  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const watchedData = watch()
  const onChangeRef = useRef(onChange)
  const previousDataRef = useRef<string>('')

  // Atualizar ref sempre que onChange mudar
  onChangeRef.current = onChange

  // Handler de upload de imagem
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    setIsUploading(true)
    
    try {
      const result = await uploadImage({
        file,
        folder: 'landing-page/hero',
      })
      
      if (result.success && result.url) {
        setValue('backgroundImage', result.url)
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
    } finally {
      setIsUploading(false)
      // Limpa o input para permitir upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  useEffect(() => {
    const currentDataString = JSON.stringify(watchedData)
    // Só chama onChange se os dados realmente mudaram
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(watchedData)
    }
  }, [watchedData])



  return (
    <Grid
      gap={6}
      templateColumns={{ base: '1fr', lg: 'minmax(0, 520px) minmax(360px, 1fr)' }}
    >
      {/* Formulário - Coluna Esquerda */}
      <GridItem order={{ base: 1, lg: 1 }}>
        <Stack gap={6}>
          {/* Bloco 1 - Headline Principal */}
          <Card.Root variant="elevated">
            <Card.Header>
              <Card.Title>Headline Principal</Card.Title>
              <Card.Description>
                Essa é a primeira frase que seu cliente verá ao entrar no site
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <Stack gap={4}>
                <Stack gap={2}>
                  <Input
                    control={control}
                    label="Título"
                    name="title"
                    placeholder="Digite o título"
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
                      Alta conversão
                    </Badge>
                  </HStack>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Essa é a primeira frase que seu cliente verá ao entrar no site
                  </Text>
                </Stack>

                <Stack gap={2}>
                  <Input
                    control={control}
                    label="Palavra em destaque"
                    name="highlightWord"
                    placeholder="Palavra que será destacada no título"
                    required
                  />
                  <HStack gap={2}>
                    <Badge
                      colorPalette="blue"
                      variant="subtle"
                    >
                      Obrigatório
                    </Badge>
                  </HStack>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Esta palavra aparecerá destacada em cor no título
                  </Text>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Bloco 2 - Contexto e Localização */}
          <Card.Root variant="elevated">
            <Card.Header>
              <Card.Title>Contexto e Localização</Card.Title>
              <Card.Description>
                Aparece logo abaixo do título no Hero
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <Stack gap={4}>
                <Stack gap={2}>
                  <Input
                    control={control}
                    label="Subtítulo"
                    name="subtitle"
                    placeholder="Digite o subtítulo"
                  />
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Aparece logo abaixo do título no Hero
                  </Text>
                </Stack>

                <Stack gap={2}>
                  <HStack gap={2}>
                    <Box flex={1}>
                      <Input
                        control={control}
                        label="Localização"
                        name="location"
                        placeholder="Digite a localização"
                      />
                    </Box>
                  </HStack>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Exibida com ícone de localização no Hero
                  </Text>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Bloco 3 - Imagem de Fundo */}
          <Card.Root variant="elevated">
            <Card.Header>
              <Card.Title>Imagem de Fundo</Card.Title>
              <Card.Description>
                Esta imagem será exibida como fundo do Hero da sua Landing Page
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <Stack gap={4}>
                {/* Preview da imagem existente */}
                {watch('backgroundImage') && (
                  <Box
                    borderColor="border.muted"
                    borderRadius="lg"
                    borderWidth="1px"
                    maxW="400px"
                    overflow="hidden"
                    position="relative"
                    w="full"
                  >
                    <Image
                      alt="Background Hero"
                      aspectRatio={16 / 9}
                      objectFit="cover"
                      src={watch('backgroundImage')}
                      w="full"
                    />
                    <Float
                      offsetX="-8px"
                      offsetY="8px"
                      placement="top-end"
                    >
                      <Button
                        colorPalette="red"
                        onClick={() => setValue('backgroundImage', '')}
                        size="xs"
                        variant="solid"
                        zIndex={10}
                      >
                        <LuX />
                      </Button>
                    </Float>
                  </Box>
                )}

                {/* FileUpload - seguindo padrão do BrandingForm */}
                <Box>
                  <input
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
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
                    onClick={() => fileInputRef.current?.click()}
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
                          ? 'Enviando imagem...' 
                          : 'Arraste a imagem de fundo ou clique para enviar'}
                      </Text>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                      >
                        PNG ou JPG • até 5MB • 16:9 recomendado
                      </Text>
                    </Stack>
                  </Box>
                </Box>

                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  A imagem de fundo aparecerá sutilmente atrás do conteúdo do Hero
                </Text>
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Bloco 4 - Informações Operacionais */}
          <Card.Root variant="elevated">
            <Card.Header>
              <Card.Title>Informações Operacionais</Card.Title>
              <Card.Description>
                Exibidas em cards no Hero para informar horários e formas de
                pagamento
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <Stack gap={6}>
                {/* Horário de Funcionamento */}
                <Stack gap={2}>
                  <HStack gap={2}>
                    <Icon
                      as={LuClock}
                      color="fg.muted"
                      size="sm"
                    />
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      Horário de Funcionamento
                    </Text>
                  </HStack>
                  <Grid
                    gap={4}
                    templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                  >
                    <Input
                      control={control}
                      label="Label"
                      name="hours.label"
                      placeholder="Ex: das 07:00 às 22:30"
                    />
                    <Input
                      control={control}
                      label="Horário"
                      name="hours.time"
                      placeholder="Ex: 07:00 - 22:30"
                    />
                    <Input
                      control={control}
                      label="Dias"
                      name="hours.days"
                      placeholder="Ex: Todos os dias"
                    />
                  </Grid>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Exibido em card no Hero para informar horários de atendimento
                  </Text>
                </Stack>

                <Separator />

                {/* Formas de Pagamento */}
                <Stack gap={2}>
                  <HStack gap={2}>
                    <Icon
                      as={LuCreditCard}
                      color="fg.muted"
                      size="sm"
                    />
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      Formas de Pagamento
                    </Text>
                  </HStack>
                  <Grid
                    gap={4}
                    templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                  >
                    <Input
                      control={control}
                      label="Label"
                      name="payment.label"
                      placeholder="Ex: Pagamento Digital"
                    />
                    <Input
                      control={control}
                      label="Métodos"
                      name="payment.methods"
                      placeholder="Ex: Cartão e PIX"
                    />
                  </Grid>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Exibido em card no Hero para mostrar formas de pagamento
                    aceitas
                  </Text>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Bloco 5 - Call To Action */}
          <Card.Root variant="elevated">
            <Card.Header>
              <Card.Title>Call To Action</Card.Title>
              <Card.Description>
                Este é o principal botão de conversão da Landing Page
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <Stack gap={4}>
                <Stack gap={2}>
                  <HStack gap={2}>
                    
                    <Box flex={1}>
                      <Input
                        control={control}
                        label="Texto do botão"
                        name="ctaText"
                        placeholder="Ex: Solicitar Atendimento"
                        required
                      />
                    </Box>
                  </HStack>
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
                      Alta conversão
                    </Badge>
                  </HStack>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Ex: WhatsApp, formulário, link externo. Este é o principal
                    botão de conversão
                  </Text>
                </Stack>

                <Stack gap={2}>
                  <Input
                    control={control}
                    label="Link do botão"
                    name="ctaLink"
                    placeholder="https://wa.me/5548999999999"
                    required
                  />
                  <HStack gap={2}>
                    <Badge
                      colorPalette="blue"
                      variant="subtle"
                    >
                      Obrigatório
                    </Badge>
                  </HStack>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    URL de destino do botão (WhatsApp, formulário, página externa)
                  </Text>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>

        </Stack>
      </GridItem>

      {/* Preview Card - Coluna Direita */}
      <GridItem order={{ base: 2, lg: 2 }}>
        <HeroPreviewCard branding={branding} data={watchedData} />
      </GridItem>
    </Grid>
  )
}

const HeroForm = memo(HeroFormBase) as typeof HeroFormBase

export { HeroForm, type Props as HeroFormProps }
