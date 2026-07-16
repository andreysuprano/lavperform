import { Box, EmptyState, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { Fragment, useMemo } from 'react'
import { PiEmpty } from 'react-icons/pi'

import { DisplaySelectedWeekday, ZoomableImage } from '@/components'
import { useWhiteLabel } from '@/config'
import { formatCurrency } from '@/utils/money'

import {
  DEFAULT_MAX_DAILY_SENDS,
  discountTypeItems,
  incitationItems,
} from '../../constants'
import { FormStepsProps } from './FormSteps.types'

export function Resume(props: FormStepsProps) {
  const { theme } = useWhiteLabel()
  const hasDelivery = theme.features.hasDelivery
  const incitation = useMemo(
    () => incitationItems.find((item) => item.value === props.formData?.incitation),
    [props.formData?.incitation]
  )

  const activeDaysStrings: string[] = Array.isArray(props.formData?.daysOfWeek)
    ? (props.formData.daysOfWeek as string[])
    : []

  const discountType = useMemo(
    () => discountTypeItems.find((item) => item.value === props.formData?.discountType),
    [props.formData?.discountType]
  )

  if (!props.formData) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <PiEmpty />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>Campos não preenchidos</EmptyState.Title>
            <EmptyState.Description>
              Volte nas etapas anteriores e informe os campos necessários para
              gerar a campanha
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <Stack>
      {/* Exibe todas as imagens: existentes + novas */}
      {((props.formData.existingImageUrls?.length ?? 0) > 0 ||
        (props.formData.newImagesBase64?.length ?? 0) > 0) && (
        <>
          <Text fontWeight="bold">
            Imagens (
            {(props.formData.existingImageUrls?.length || 0) +
              (props.formData.newImagesBase64?.length || 0)}
            ):
          </Text>
          <HStack
            mb={4}
            wrap="wrap"
          >
            {/* Imagens existentes */}
            {props.formData.existingImageUrls?.map((imageUrl, index) => (
              <Fragment key={`existing-${index}`}>
                <Box position="relative">
                  <ZoomableImage
                    alt={`Imagem existente ${index + 1}`}
                    src={imageUrl}
                  />
                  <Box
                    bg="green.500"
                    borderRadius="sm"
                    bottom={1}
                    color="white"
                    fontSize="xs"
                    left={1}
                    position="absolute"
                    px={1}
                    py={0.5}
                  >
                    Existente
                  </Box>
                </Box>
              </Fragment>
            ))}
            {/* Novas imagens */}
            {props.formData.newImagesBase64?.map((item, index) => (
              <Fragment key={`new-${index}`}>
                <Box position="relative">
                  <ZoomableImage
                    alt={`Nova imagem ${index + 1}`}
                    src={item}
                  />
                  <Box
                    bg="blue.500"
                    borderRadius="sm"
                    bottom={1}
                    color="white"
                    fontSize="xs"
                    left={1}
                    position="absolute"
                    px={1}
                    py={0.5}
                  >
                    Nova
                  </Box>
                </Box>
              </Fragment>
            ))}
          </HStack>
        </>
      )}

      {/* Fallback para compatibilidade com imagesBase64 antigo */}
      {!props.formData.existingImageUrls &&
        !props.formData.newImagesBase64 &&
        props.formData.imagesBase64 &&
        props.formData.imagesBase64.length > 0 && (
          <>
            <Text fontWeight="bold">Imagens:</Text>
            <HStack
              mb={4}
              wrap="wrap"
            >
              {props.formData.imagesBase64.map((item, index) => {
                return (
                  <Fragment key={index}>
                    <ZoomableImage
                      alt={
                        props.formData?.images[index]?.name ||
                        `Imagem ${index + 1}`
                      }
                      src={item}
                    />
                  </Fragment>
                )
              })}
            </HStack>
          </>
        )}
      {props.formData.messageText && (
        <>
          <Text fontWeight="bold">Comunicação da campanha:</Text>
          <Text mb={4}>{props.formData.messageText}</Text>
        </>
      )}
      <Text fontWeight="bold">Limite máximo de envios por dia:</Text>
      <Text mb={4}>
        {props.formData.maxDailySends ?? DEFAULT_MAX_DAILY_SENDS}
      </Text>
      {!!incitation?.title &&
        !(props.formData.incitation === 'tax' && !hasDelivery) && (
        <>
          <Text fontWeight="bold">Tipo de incentivo:</Text>
          <Text mb={4}>{incitation.title}</Text>
          {props.formData.incitation === 'tax' && (
            <>
              <Text fontWeight="bold">Raio de entrega:</Text>
              <Text mb={4}>{props.formData.deliveryRadius} KM</Text>
            </>
          )}
          {props.formData.incitation === 'discount' && discountType?.title && (
            <>
              <Text fontWeight="bold">Tipo de desconto:</Text>
              <Text mb={4}>{discountType?.title}</Text>
              {props.formData.discountType === 'percent' && (
                <>
                  <Text fontWeight="bold">Porcentagem de desconto:</Text>
                  <Text mb={4}>{props.formData.discountPercent}%</Text>
                </>
              )}
              {props.formData.discountType === 'currency' && (
                <>
                  <Text fontWeight="bold">Valor de desconto:</Text>
                  <Text mb={4}>
                    {formatCurrency(props.formData.discountCurrency)}
                  </Text>
                </>
              )}
            </>
          )}
        </>
      )}
      <DisplaySelectedWeekday
        displayItems={activeDaysStrings}
        label="Disponibilidade Semanal de Agendamento:"
      />
    </Stack>
  )
}
