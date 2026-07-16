import {
  Button,
  Card,
  Fieldset,
  HStack,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiAddLine, RiDeleteBinLine, RiEditLine } from 'react-icons/ri'

import { Input, Textarea } from '@/components/forms'
import type { TestimonialItem } from '../../../types'

import { Props } from './TestimonialsForm.types'

function TestimonialsFormBase({ data, onChange }: Props) {
  const { control, watch } = useForm({
    defaultValues: {
      title: data.title,
      description: data.description,
    },
  })

  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    data.items
  )
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
      items: testimonials,
    }
    const currentDataString = JSON.stringify(currentData)
    // Só chama onChange se os dados realmente mudaram
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(currentData)
    }
  }, [watchedData, testimonials])

  const handleAddTestimonial = useCallback(() => {
    setIsAdding(true)
    setEditingIndex(null)
  }, [])

  const handleEditTestimonial = useCallback((index: number) => {
    setEditingIndex(index)
    setIsAdding(false)
  }, [])

  const handleDeleteTestimonial = useCallback((index: number) => {
    setTestimonials((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSaveTestimonial = useCallback(
    (testimonialData: TestimonialItem) => {
      if (editingIndex !== null) {
        setTestimonials((prev) =>
          prev.map((item, i) => (i === editingIndex ? testimonialData : item))
        )
        setEditingIndex(null)
      } else {
        setTestimonials((prev) => [...prev, testimonialData])
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
            placeholder="Ex: Avaliações"
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
        <Fieldset.Legend>Depoimentos</Fieldset.Legend>
        <Fieldset.Content>
          <VStack gap={4} w="full">
            {testimonials.map((testimonial, index) => (
              <>
                <Card.Root key={index} w="full">
                  <Card.Body p={4}>
                    <HStack justifyContent="space-between" mb={4}>
                      <Text fontWeight="bold">{testimonial.author}</Text>
                      <HStack gap={2}>
                        <Button
                          onClick={() => handleEditTestimonial(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <RiEditLine />
                          Editar
                        </Button>
                        <Button
                          colorScheme="red"
                          onClick={() => handleDeleteTestimonial(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <RiDeleteBinLine />
                          Remover
                        </Button>
                      </HStack>
                    </HStack>
                    <Text color="fg.muted" fontSize="sm" fontStyle="italic">
                      "{testimonial.quote}"
                    </Text>
                  </Card.Body>
                </Card.Root>

                {/* Formulário de edição aparece logo abaixo do card específico */}
                {editingIndex === index && (
                  <TestimonialFormComponent
                    initialData={testimonials[editingIndex]}
                    onCancel={() => {
                      setEditingIndex(null)
                    }}
                    onSave={handleSaveTestimonial}
                  />
                )}
              </>
            ))}

            {/* Formulário de adicionar aparece no final */}
            {isAdding && (
              <TestimonialFormComponent
                onCancel={() => {
                  setIsAdding(false)
                }}
                onSave={handleSaveTestimonial}
              />
            )}

            {!isAdding && editingIndex === null && (
              <Button
                leftIcon={<RiAddLine />}
                onClick={handleAddTestimonial}
                variant="outline"
                w="full"
              >
                Adicionar Depoimento
              </Button>
            )}
          </VStack>
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

interface TestimonialFormComponentProps {
  initialData?: TestimonialItem
  onSave: (data: TestimonialItem) => void
  onCancel: () => void
}

function TestimonialFormComponent({
  initialData,
  onSave,
  onCancel,
}: TestimonialFormComponentProps) {
  const { control, handleSubmit, reset } = useForm<TestimonialItem>({
    defaultValues: initialData || {
      quote: '',
      author: '',
    },
  })

  const onSubmit = useCallback(
    (data: TestimonialItem) => {
      onSave(data)
      reset()
    },
    [onSave, reset]
  )

  return (
    <Card.Root w="full">
      <Card.Body p={4}>
        <Stack gap={4}>
          <Textarea
            control={control}
            label="Depoimento"
            name="quote"
            placeholder="Digite o depoimento do cliente"
            required
            rows={4}
          />

          <Input
            control={control}
            label="Autor"
            name="author"
            placeholder="Nome do cliente"
            required
          />

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

const TestimonialsForm = memo(
  TestimonialsFormBase
) as typeof TestimonialsFormBase

export { TestimonialsForm, type Props as TestimonialsFormProps }
