import {
  Avatar,
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  HStack,
  Portal,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { RiUserLine, RiMailLine, RiPhoneLine } from 'react-icons/ri'

import { formatTelefone } from '@/utils/mask'
import { getInitials } from '@/utils/strings'
import { getWeatherConditionLabel } from '@/whitelabel/utils'
import { useWeatherHistory } from '@/whitelabel/hooks'
import type { WeatherCondition } from '@/whitelabel/types'

import { Props } from './WeatherAlertDetailsModal.types'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function WeatherAlertDetailsModalBase({
  alertId,
  isOpen,
  onClose,
}: Props) {
  const { data: historyData } = useWeatherHistory()

  // Buscar o alerta específico do histórico
  const alert = useMemo(() => {
    if (!alertId || !historyData) return null
    return historyData.find((a) => a.id === alertId)
  }, [alertId, historyData])

  // Informações do cliente (se disponíveis)
  const initials = useMemo(() => {
    if (!alert) return '??'
    // Por enquanto, usar iniciais genéricas já que a API não retorna dados do cliente
    return '?'
  }, [alert])

  if (!alert || !isOpen) {
    return null
  }

  return (
    <Portal>
      <Dialog.Root
        open={isOpen}
        size="lg"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            {/* Header customizado */}
            <Box
              bg="bg.muted"
              borderBottomWidth="1px"
              p={6}
            >
              <Flex
                alignItems="center"
                gap={4}
                justifyContent="space-between"
              >
                <Flex
                  alignItems="center"
                  gap={4}
                >
                  {/* Avatar */}
                  <Avatar.Root
                    bg="primary.500"
                    color="white"
                    size="lg"
                  >
                    <Avatar.Fallback>{initials}</Avatar.Fallback>
                  </Avatar.Root>

                  {/* Informações do envio */}
                  <Stack gap={1}>
                    <Text
                      fontSize="xl"
                      fontWeight="bold"
                    >
                      Detalhes do Alerta
                    </Text>
                    <HStack
                      fontSize="sm"
                      gap={2}
                    >
                      <Badge
                        colorPalette={alert.sent ? 'green' : 'red'}
                        variant="solid"
                      >
                        {alert.sent ? 'Enviado' : 'Falha no Envio'}
                      </Badge>
                      {alert.channel && (
                        <Badge
                          colorPalette="blue"
                          variant="subtle"
                        >
                          {alert.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </Badge>
                      )}
                    </HStack>
                  </Stack>
                </Flex>

                <CloseButton onClick={onClose} />
              </Flex>
            </Box>

            {/* Corpo do modal */}
            <Dialog.Body p={6}>
              <Stack gap={6}>
                {/* Informações do Alerta */}
                <Stack gap={3}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    textTransform="uppercase"
                  >
                    Informações do Alerta
                  </Text>

                  <Stack gap={2}>
                    <HStack>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                        minW="120px"
                      >
                        Condição:
                      </Text>
                      <Badge
                        colorPalette="purple"
                        variant="subtle"
                      >
                        {getWeatherConditionLabel(
                          alert.condition as WeatherCondition
                        )}
                      </Badge>
                    </HStack>

                    <HStack>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                        minW="120px"
                      >
                        Data/Hora:
                      </Text>
                      <Text fontSize="sm">{formatDate(alert.date)}</Text>
                    </HStack>

                    {alert.sentAt && (
                      <HStack>
                        <Text
                          color="fg.muted"
                          fontSize="sm"
                          minW="120px"
                        >
                          Enviado em:
                        </Text>
                        <Text fontSize="sm">{formatDate(alert.sentAt)}</Text>
                      </HStack>
                    )}
                  </Stack>
                </Stack>

                <Separator />

                {/* Mensagem Enviada */}
                <Stack gap={3}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    textTransform="uppercase"
                  >
                    Mensagem Enviada
                  </Text>
                  <Box
                    bg="bg.subtle"
                    borderRadius="md"
                    borderWidth="1px"
                    p={4}
                  >
                    <Text
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                    >
                      {alert.message}
                    </Text>
                  </Box>
                </Stack>

                {/* Erro (se houver) */}
                {!alert.sent && alert.errorMessage && (
                  <>
                    <Separator />
                    <Stack gap={3}>
                      <Text
                        color="red.500"
                        fontSize="sm"
                        fontWeight="semibold"
                        textTransform="uppercase"
                      >
                        Erro no Envio
                      </Text>
                      <Box
                        bg="red.50"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="red.200"
                        p={4}
                      >
                        <Text
                          color="red.700"
                          fontSize="sm"
                        >
                          {alert.errorMessage}
                        </Text>
                      </Box>
                    </Stack>
                  </>
                )}
              </Stack>
            </Dialog.Body>

            {/* Footer */}
            <Dialog.Footer>
              <Button onClick={onClose}>Fechar</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  )
}

const WeatherAlertDetailsModal = memo(
  WeatherAlertDetailsModalBase
) as typeof WeatherAlertDetailsModalBase

export {
  WeatherAlertDetailsModal,
  type Props as WeatherAlertDetailsModalProps,
}
