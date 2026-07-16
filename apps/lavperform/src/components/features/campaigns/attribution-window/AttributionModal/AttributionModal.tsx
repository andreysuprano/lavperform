import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Input as ChakraInput,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import { toaster } from '@/components/ui/toaster'
import { useUpdateAttributionSegment } from '@/hooks/queries'
import type { SegmentAttribution, UpdateSegmentAttributionPayload } from '@/types'

import type { Props } from './AttributionModal.types'

type FormData = {
  conversionDays: number
}

const schema: yup.ObjectSchema<FormData> = yup.object({
  conversionDays: yup
    .number()
    .typeError('Informe um número válido')
    .required('Dias é obrigatório')
    .integer('Dias deve ser um número inteiro')
    .min(1, 'Mínimo: 1 dia')
    .max(365, 'Máximo: 365 dias'),
})

function AttributionModalBase({ isOpen, segment, onClose }: Props) {
  const update = useUpdateAttributionSegment()

  const defaultValues = useMemo<FormData>(
    () => ({
      conversionDays: segment?.conversionDays ?? 7,
    }),
    [segment?.conversionDays]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues,
    mode: 'onChange',
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!segment || update.isPending) return

      const payload: UpdateSegmentAttributionPayload = {
        segmentId: segment.id,
        conversionDays: data.conversionDays,
      }

      try {
        await update.mutateAsync(payload)
        toaster.create({
          title: 'Sucesso',
          description: 'Configuração salva.',
          type: 'success',
        })
        onClose()
      } catch {
        toaster.create({
          title: 'Erro',
          description: 'Não foi possível salvar a configuração.',
          type: 'error',
        })
      }
    },
    [onClose, segment, update]
  )

  const segmentName = (segment as SegmentAttribution | null)?.name ?? ''

  return (
    <Dialog.Root
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      open={isOpen}
      placement="center"
      size="sm"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            borderRadius="md"
            shadow="md"
            textAlign="center"
          >
            <Dialog.Header
              alignItems="center"
              display="flex"
              justifyContent="center"
            >
              <Dialog.Title
                alignItems="center"
                display="flex"
                fontWeight="bold"
                justifyContent="center"
              >
                {segmentName}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Flex
                align="center"
                direction="column"
                gap={3}
              >
                <Flex
                  align="center"
                  flexWrap="wrap"
                  fontSize="sm"
                  fontWeight="normal"
                  gap={2}
                  justify="center"
                  maxW="420px"
                >
                  <Text as="span">
                    Quando os clientes categorizados como &quot;{segmentName}
                    &quot; comprarem dentro de
                  </Text>
                  <Box w="88px">
                    <Field.Root
                      invalid={!!errors.conversionDays}
                      required
                    >
                      <ChakraInput
                        min={1}
                        step={1}
                        textAlign="center"
                        type="number"
                        {...register('conversionDays')}
                      />
                    </Field.Root>
                  </Box>
                  <Text as="span">
                    dias, após terem recebido a mensagem, contaremos como
                    conversão.
                  </Text>
                </Flex>
                {!!errors.conversionDays?.message && (
                  <Text
                    color="fg.error"
                    fontSize="xs"
                  >
                    {errors.conversionDays.message}
                  </Text>
                )}
              </Flex>

              <Stack
                direction="row"
                gap={2}
                justify="center"
                mt={6}
              >
                <Button
                  onClick={onClose}
                  size="sm"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  loading={update.isPending}
                  onClick={handleSubmit(onSubmit)}
                  size="sm"
                >
                  Salvar
                </Button>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const AttributionModal = memo(AttributionModalBase) as typeof AttributionModalBase

export { AttributionModal, type Props as AttributionModalProps }

