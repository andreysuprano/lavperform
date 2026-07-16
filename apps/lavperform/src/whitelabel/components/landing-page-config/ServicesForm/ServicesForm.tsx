import {
  Box,
  Button,
  Card,
  Fieldset,
  HStack,
  Input as ChakraInput,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiAddLine, RiDeleteBinLine, RiEditLine } from 'react-icons/ri'

import { Input, Textarea } from '@/components/forms'
import type { ServiceItem } from '../../../types'

import { Props } from './ServicesForm.types'

function ServicesFormBase({ data, onChange }: Props) {
  const { control, watch, setValue } = useForm({
    defaultValues: {
      title: data.title,
      description: data.description,
    },
  })

  const [services, setServices] = useState<ServiceItem[]>(data.items)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const watchedData = watch()
  const onChangeRef = useRef(onChange)
  const previousDataRef = useRef<string>('')

  // Atualizar ref sempre que onChange mudar
  onChangeRef.current = onChange

  useEffect(() => {
    const currentData = {
      title: watchedData.title,
      description: watchedData.description,
      items: services,
    }
    const currentDataString = JSON.stringify(currentData)
    // Só chama onChange se os dados realmente mudaram
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(currentData)
    }
  }, [watchedData, services])

  const handleAddService = useCallback(() => {
    setIsAdding(true)
    setEditingIndex(null)
  }, [])

  const handleEditService = useCallback((index: number) => {
    setEditingIndex(index)
    setIsAdding(false)
  }, [])

  const handleDeleteService = useCallback(
    (index: number) => {
      setServices((prev) => prev.filter((_, i) => i !== index))
    },
    []
  )

  const handleSaveService = useCallback(
    (serviceData: ServiceItem) => {
      if (editingIndex !== null) {
        setServices((prev) =>
          prev.map((item, i) => (i === editingIndex ? serviceData : item))
        )
        setEditingIndex(null)
      } else {
        setServices((prev) => [...prev, serviceData])
        setIsAdding(false)
      }
    },
    [editingIndex]
  )

  return (
    <Stack gap={6}>
      <Fieldset.Root>
        <Fieldset.Legend>Informações Gerais</Fieldset.Legend>
        <Fieldset.Content>
          <Input
            control={control}
            label="Título da seção"
            name="title"
            placeholder="Ex: Serviços"
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
        <Fieldset.Legend>Serviços</Fieldset.Legend>
        <Fieldset.Content>
          <VStack gap={4} w="full">
            {services.map((service, index) => (
              <>
                <Card.Root key={index} w="full">
                  <Card.Body p={4}>
                    <HStack justifyContent="space-between" mb={4}>
                      <Text fontWeight="bold">{service.title}</Text>
                      <HStack gap={2}>
                        <Button
                          onClick={() => handleEditService(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <RiEditLine />
                          Editar
                        </Button>
                        <Button
                          colorScheme="red"
                          onClick={() => handleDeleteService(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <RiDeleteBinLine />
                          Remover
                        </Button>
                      </HStack>
                    </HStack>
                    <Text color="fg.muted" fontSize="sm">
                      {service.description}
                    </Text>
                    <Text color="primary.500" fontSize="lg" fontWeight="bold" mt={2}>
                      {service.price}
                    </Text>
                  </Card.Body>
                </Card.Root>

                {/* Formulário de edição aparece logo abaixo do card específico */}
                {editingIndex === index && (
                  <ServiceFormComponent
                    initialData={services[editingIndex]}
                    onCancel={() => {
                      setEditingIndex(null)
                    }}
                    onSave={handleSaveService}
                  />
                )}
              </>
            ))}

            {/* Formulário de adicionar aparece no final */}
            {isAdding && (
              <ServiceFormComponent
                onCancel={() => {
                  setIsAdding(false)
                }}
                onSave={handleSaveService}
              />
            )}

            {!isAdding && editingIndex === null && (
              <Button
                leftIcon={<RiAddLine />}
                onClick={handleAddService}
                variant="outline"
                w="full"
              >
                Adicionar Serviço
              </Button>
            )}
          </VStack>
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

interface ServiceFormComponentProps {
  initialData?: ServiceItem
  onSave: (data: ServiceItem) => void
  onCancel: () => void
}

function ServiceFormComponent({ initialData, onSave, onCancel }: ServiceFormComponentProps) {
  const { control, handleSubmit, reset } = useForm<ServiceItem>({
    defaultValues: initialData || {
      title: '',
      description: '',
      price: '',
      vantageList: [''],
    },
  })

  const [vantages, setVantages] = useState<string[]>(
    initialData?.vantageList || ['']
  )

  const onSubmit = useCallback(
    (data: ServiceItem) => {
      onSave({
        ...data,
        vantageList: vantages.filter((v) => v.trim() !== ''),
      })
      reset()
      setVantages([''])
    },
    [vantages, onSave, reset]
  )

  const handleAddVantage = useCallback(() => {
    setVantages((prev) => [...prev, ''])
  }, [])

  const handleRemoveVantage = useCallback((index: number) => {
    setVantages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleVantageChange = useCallback((index: number, value: string) => {
    setVantages((prev) => prev.map((v, i) => (i === index ? value : v)))
  }, [])

  return (
    <Card.Root w="full">
      <Card.Body p={4}>
        <Stack gap={4}>
          <Input
            control={control}
            label="Título do serviço"
            name="title"
            placeholder="Ex: Lavagem"
            required
          />

          <Textarea
            control={control}
            label="Descrição"
            name="description"
            placeholder="Digite a descrição"
            rows={3}
          />

          <Input
            control={control}
            label="Preço"
            name="price"
            placeholder="Ex: R$ 17,90"
            required
          />

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Vantagens
            </Text>
            <VStack gap={2}>
              {vantages.map((vantage, index) => (
                <HStack key={index} w="full">
                  <ChakraInput
                    flex={1}
                    onChange={(e) =>
                      handleVantageChange(index, e.target.value)
                    }
                    placeholder="Digite uma vantagem"
                    value={vantage}
                  />
                  {vantages.length > 1 && (
                    <Button
                      colorScheme="red"
                      onClick={() => handleRemoveVantage(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <RiDeleteBinLine />
                    </Button>
                  )}
                </HStack>
              ))}
              <Button
                leftIcon={<RiAddLine />}
                onClick={handleAddVantage}
                size="sm"
                variant="outline"
                w="full"
              >
                Adicionar Vantagem
              </Button>
            </VStack>
          </Box>

          <HStack gap={2} justifyContent="flex-end">
            <Button onClick={onCancel} variant="ghost">
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>
              Salvar
            </Button>
          </HStack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const ServicesForm = memo(ServicesFormBase) as typeof ServicesFormBase

export { ServicesForm, type Props as ServicesFormProps }
