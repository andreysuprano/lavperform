import {
  Alert,
  Box,
  Button,
  Card,
  Fieldset,
  Grid,
  GridItem,
  HStack,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiMapPinLine } from 'react-icons/ri'

import { Input, Textarea } from '@/components/forms'
import type { LocationItem } from '@/whitelabel/types'

import { LocationPreviewCard } from './LocationPreviewCard'
import { Props } from './LocationForm.types'

function LocationFormBase({ data, onChange, branding }: Props) {
  const { control, watch } = useForm({
    defaultValues: {
      title: data.title,
      description: data.description,
    },
  })

  const [locations, setLocations] = useState<LocationItem[]>(data.items ?? [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const watchedData = watch()
  const onChangeRef = useRef(onChange)
  const previousDataRef = useRef<string>('')

  onChangeRef.current = onChange

  useEffect(() => {
    const currentData = {
      title: watchedData.title,
      description: watchedData.description,
      items: locations,
    }
    const currentDataString = JSON.stringify(currentData)
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(currentData)
    }
  }, [watchedData, locations])

  const handleAddLocation = useCallback(() => {
    setIsAdding(true)
    setEditingIndex(null)
  }, [])

  const handleEditLocation = useCallback((index: number) => {
    setEditingIndex(index)
    setIsAdding(false)
  }, [])

  const handleDeleteLocation = useCallback((index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSaveLocation = useCallback(
    (locationData: LocationItem) => {
      if (editingIndex !== null) {
        setLocations((prev) =>
          prev.map((item, i) => (i === editingIndex ? locationData : item))
        )
        setEditingIndex(null)
      } else {
        setLocations((prev) => [...prev, locationData])
        setIsAdding(false)
      }
    },
    [editingIndex]
  )

  const handleCancelEdit = useCallback(() => setEditingIndex(null), [])
  const handleCancelAdd = useCallback(() => setIsAdding(false), [])

  const previewData = useMemo(
    () => ({
      title: watchedData.title,
      description: watchedData.description,
      items: locations,
    }),
    [watchedData.title, watchedData.description, locations]
  )

  return (
    <Grid
      gap={6}
      templateColumns={{ base: '1fr', lg: 'minmax(0, 520px) minmax(360px, 1fr)' }}
    >
      <GridItem order={{ base: 1, lg: 1 }}>
        <Stack gap={6}>
          <Fieldset.Root>
            <Fieldset.Legend>Informações Gerais</Fieldset.Legend>
            <Fieldset.Content>
              <Input
                control={control}
                label="Título da seção"
                name="title"
                placeholder="Ex: Localização"
                required
              />

              <Textarea
                control={control}
                label="Descrição"
                name="description"
                placeholder="Digite a descrição"
                rows={3}
              />
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Legend>Unidades / Lojas</Fieldset.Legend>
            <Fieldset.HelperText>
              O endereço cadastrado nas configurações da empresa não atualiza a
              landing. Banner e rodapé também têm campos próprios.
            </Fieldset.HelperText>
            <Fieldset.Content>
              <Stack gap={4} w="full">
                <Alert.Root size="sm" status="info" variant="surface">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Como preencher o mapa</Alert.Title>
                    <Alert.Description>
                      Abra o ponto no Google Maps e use Compartilhar. O link
                      curto (maps.app.goo.gl) vai em URL do mapa e em Link do
                      Google Maps. A URL de incorporação precisa ser o src do
                      iframe (começa com maps/embed?pb=), em Incorporar um mapa.
                      Salve a unidade e depois Salvar alterações no rodapé desta
                      página.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 2 }} gap={4} w="full">
                  {locations.map((location, index) => (
                    <Card.Root key={location.id ?? index} w="full">
                      <Card.Body p={4}>
                        <Stack gap={3}>
                          <Box>
                            <Text fontWeight="bold" lineClamp={1}>
                              {location.placeName}
                            </Text>
                            <Text color="fg.muted" fontSize="sm" lineClamp={2}>
                              {location.address}
                            </Text>
                            {location.googleMapsLink && (
                              <Link
                                alignItems="center"
                                color="blue.500"
                                display="inline-flex"
                                fontSize="sm"
                                gap={1}
                                href={location.googleMapsLink}
                                mt={1}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                <RiMapPinLine />
                                Ver no Maps
                              </Link>
                            )}
                          </Box>
                          <HStack gap={2}>
                            <Button
                              flex={1}
                              onClick={() => handleEditLocation(index)}
                              size="sm"
                              variant="ghost"
                            >
                              <RiEditLine />
                              Editar
                            </Button>
                            <Button
                              colorPalette="red"
                              flex={1}
                              onClick={() => handleDeleteLocation(index)}
                              size="sm"
                              variant="ghost"
                            >
                              <RiDeleteBinLine />
                              Remover
                            </Button>
                          </HStack>
                        </Stack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </SimpleGrid>

                {editingIndex !== null && (
                  <LocationItemForm
                    initialData={locations[editingIndex]}
                    onCancel={handleCancelEdit}
                    onSave={handleSaveLocation}
                  />
                )}

                {isAdding && (
                  <LocationItemForm
                    onCancel={handleCancelAdd}
                    onSave={handleSaveLocation}
                  />
                )}

                {!isAdding && editingIndex === null && (
                  <Button onClick={handleAddLocation} variant="outline" w="full">
                    <RiAddLine />
                    Adicionar Unidade
                  </Button>
                )}
              </Stack>
            </Fieldset.Content>
          </Fieldset.Root>
        </Stack>
      </GridItem>

      <GridItem order={{ base: 2, lg: 2 }}>
        <LocationPreviewCard branding={branding} data={previewData} />
      </GridItem>
    </Grid>
  )
}

interface LocationItemFormProps {
  initialData?: LocationItem
  onSave: (data: LocationItem) => void
  onCancel: () => void
}

function LocationItemForm({ initialData, onSave, onCancel }: LocationItemFormProps) {
  const { control, handleSubmit, reset } = useForm<LocationItem>({
    defaultValues: initialData ?? {
      id: crypto.randomUUID(),
      placeName: '',
      address: '',
      mapUrl: '',
      mapEmbedUrl: '',
      googleMapsLink: '',
    },
  })

  const onSubmit = useCallback(
    (data: LocationItem) => {
      onSave(data)
      reset()
    },
    [onSave, reset]
  )

  return (
    <Stack gap={4}>
      <Input
        control={control}
        label="Nome do local"
        name="placeName"
        placeholder="Ex: Loja Centro, Unidade Shopping"
        required
      />

      <Stack gap={1}>
        <Textarea
          control={control}
          label="Endereço completo"
          name="address"
          placeholder="Digite o endereço completo"
          required
          rows={2}
        />
        <Text color="fg.muted" fontSize="xs">
          Use rua, número, bairro e cidade como no Google Maps. Esse texto
          aparece na landing e é o que o mapa público usa para localizar o
          ponto.
        </Text>
      </Stack>

      <Stack gap={1}>
        <Input
          control={control}
          label="URL do mapa (Google Maps)"
          name="mapUrl"
          placeholder="https://maps.app.goo.gl/..."
        />
        <Text color="fg.muted" fontSize="xs">
          Opcional. Em Compartilhar, use Copiar link
          (https://maps.app.goo.gl/...).
        </Text>
      </Stack>

      <Stack gap={1}>
        <Input
          control={control}
          label="URL de incorporação do mapa"
          name="mapEmbedUrl"
          placeholder="https://www.google.com/maps/embed?pb=..."
          required
        />
        <Text color="fg.muted" fontSize="xs">
          Obrigatório. Em Compartilhar → Incorporar um mapa, copie só o que
          está em src do iframe. Deve começar com
          https://www.google.com/maps/embed?pb= — o link curto não funciona
          neste campo.
        </Text>
      </Stack>

      <Stack gap={1}>
        <Input
          control={control}
          label="Link do Google Maps"
          name="googleMapsLink"
          placeholder="https://maps.app.goo.gl/..."
          required
        />
        <Text color="fg.muted" fontSize="xs">
          Obrigatório. Use o mesmo link curto de Copiar link. É o botão Ver
          no mapa.
        </Text>
      </Stack>

      <HStack gap={2} justifyContent="flex-end">
        <Button onClick={onCancel} variant="ghost">
          Cancelar
        </Button>
        <Button onClick={handleSubmit(onSubmit)}>Salvar</Button>
      </HStack>
    </Stack>
  )
}

const LocationForm = memo(LocationFormBase) as typeof LocationFormBase

export { LocationForm, type Props as LocationFormProps }
