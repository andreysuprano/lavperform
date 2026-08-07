import {
  Box,
  Button,
  Card,
  Fieldset,
  Grid,
  GridItem,
  HStack,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiAddLine, RiDeleteBinLine, RiEditLine } from 'react-icons/ri'

import { Input, Textarea } from '@/components/forms'
import type { FaqItem } from '../../../types'

import { FaqPreviewCard } from './FaqPreviewCard'
import { Props } from './FaqForm.types'

function FaqFormBase({ data, onChange, branding }: Props) {
  const { control, watch } = useForm({
    defaultValues: {
      title: data.title,
      description: data.description,
    },
  })

  const [faqs, setFaqs] = useState<FaqItem[]>(data.items)
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
      items: faqs,
    }
    const currentDataString = JSON.stringify(currentData)
    // Só chama onChange se os dados realmente mudaram
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(currentData)
    }
  }, [watchedData, faqs])

  const handleAddFaq = useCallback(() => {
    setIsAdding(true)
    setEditingIndex(null)
  }, [])

  const handleEditFaq = useCallback((index: number) => {
    setEditingIndex(index)
    setIsAdding(false)
  }, [])

  const handleDeleteFaq = useCallback((index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSaveFaq = useCallback(
    (faqData: FaqItem) => {
      if (editingIndex !== null) {
        setFaqs((prev) =>
          prev.map((item, i) => (i === editingIndex ? faqData : item))
        )
        setEditingIndex(null)
      } else {
        setFaqs((prev) => [...prev, faqData])
        setIsAdding(false)
      }
    },
    [editingIndex]
  )

  const previewData = useMemo(
    () => ({
      title: watchedData.title,
      description: watchedData.description,
      items: faqs,
    }),
    [watchedData.title, watchedData.description, faqs]
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
                placeholder="Ex: Perguntas Frequentes"
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
            <Fieldset.Legend>Perguntas e Respostas</Fieldset.Legend>
            <Fieldset.Content>
              <VStack gap={4} w="full">
                {faqs.map((faq, index) => (
                  <Box key={faq.value || `${faq.title}-${index}`} w="full">
                    <Card.Root w="full">
                      <Card.Body p={4}>
                        <HStack justifyContent="space-between" mb={4}>
                          <Text fontWeight="bold">{faq.title}</Text>
                          <HStack gap={2}>
                            <Button
                              onClick={() => handleEditFaq(index)}
                              size="sm"
                              variant="ghost"
                            >
                              <RiEditLine />
                              Editar
                            </Button>
                            <Button
                              colorScheme="red"
                              onClick={() => handleDeleteFaq(index)}
                              size="sm"
                              variant="ghost"
                            >
                              <RiDeleteBinLine />
                              Remover
                            </Button>
                          </HStack>
                        </HStack>
                        <Box
                          dangerouslySetInnerHTML={{ __html: faq.text }}
                          fontSize="sm"
                          maxH="100px"
                          overflow="hidden"
                        />
                      </Card.Body>
                    </Card.Root>

                    {editingIndex === index && (
                      <Box mt={4}>
                        <FaqFormComponent
                          initialData={faqs[editingIndex]}
                          onCancel={() => {
                            setEditingIndex(null)
                          }}
                          onSave={handleSaveFaq}
                        />
                      </Box>
                    )}
                  </Box>
                ))}

                {isAdding && (
                  <FaqFormComponent
                    onCancel={() => {
                      setIsAdding(false)
                    }}
                    onSave={handleSaveFaq}
                  />
                )}

                {!isAdding && editingIndex === null && (
                  <Button
                    leftIcon={<RiAddLine />}
                    onClick={handleAddFaq}
                    variant="outline"
                    w="full"
                  >
                    Adicionar Pergunta
                  </Button>
                )}
              </VStack>
            </Fieldset.Content>
          </Fieldset.Root>
        </Stack>
      </GridItem>

      <GridItem order={{ base: 2, lg: 2 }}>
        <FaqPreviewCard branding={branding} data={previewData} />
      </GridItem>
    </Grid>
  )
}

interface FaqFormComponentProps {
  initialData?: FaqItem
  onSave: (data: FaqItem) => void
  onCancel: () => void
}

function FaqFormComponent({ initialData, onSave, onCancel }: FaqFormComponentProps) {
  const { control, handleSubmit, reset } = useForm<FaqItem>({
    defaultValues: initialData || {
      value: String(Date.now()),
      title: '',
      text: '',
    },
  })

  const onSubmit = useCallback(
    (data: FaqItem) => {
      onSave(data)
      reset()
    },
    [onSave, reset]
  )

  return (
    <Card.Root w="full">
      <Card.Body p={4}>
        <Stack gap={4}>
          <Input
            control={control}
            label="Pergunta"
            name="title"
            placeholder="Digite a pergunta"
            required
          />

          <Textarea
            control={control}
            label="Resposta (suporta HTML)"
            name="text"
            placeholder="Digite a resposta. Você pode usar HTML básico como &lt;b&gt;, &lt;ul&gt;, &lt;li&gt;, etc."
            required
            rows={8}
          />

          <Text color="fg.muted" fontSize="xs">
            Você pode usar HTML básico: &lt;b&gt;, &lt;strong&gt;, &lt;ul&gt;,
            &lt;ol&gt;, &lt;li&gt;, &lt;br/&gt;
          </Text>

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

const FaqForm = memo(FaqFormBase) as typeof FaqFormBase

export { FaqForm, type Props as FaqFormProps }
