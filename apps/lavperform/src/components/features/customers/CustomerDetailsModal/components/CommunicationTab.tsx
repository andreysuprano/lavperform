import {
  Badge,
  Box,
  Card,
  Field,
  Flex,
  HStack,
  Icon,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState, useRef } from 'react'
import {
  RiMessageLine,
  RiWhatsappLine,
  RiMailLine,
  RiPhoneLine,
} from 'react-icons/ri'
import {
  SiIfood,
} from 'react-icons/si'
import { MdRestaurantMenu } from 'react-icons/md'

import type { Customer, CustomerMessageDetail } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { customerService } from '@/services'
import { MessageTimelineModal } from './MessageTimelineModal'
import { LoadingState, toaster, ZoomableImage } from '@/components'
import { useEffect } from 'react'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { formatTelefone } from '@/utils/mask'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateQueries, queryKeys } from '@/lib/react-query'
import { convertLinkToResizedImage } from '@/firebase/storage'

type Props = {
  customer: Customer
}

// Mapa de ícones por plataforma
const platformIcons = {
  whatsapp: RiWhatsappLine,
  ifood: SiIfood,
  cardapio_digital: MdRestaurantMenu,
  sms: RiPhoneLine,
  email: RiMailLine,
}

// Mapa de cores por plataforma
const platformColors = {
  whatsapp: 'green',
  ifood: 'red',
  cardapio_digital: 'orange',
  sms: 'blue',
  email: 'purple',
}

// Mapa de cores por status
const statusColors = {
  sent: 'green', // Mensagem enviada com sucesso
  processing: 'orange', // Mensagem sendo processada (aguardando envio)
  delivered: 'blue', // Mensagem entregue ao destinatário
  read: 'green', // Mensagem lida pelo destinatário
  failed: 'red', // Falha no envio
}

export function CommunicationTab({ customer }: Props) {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()
  const [whatsappOptin, setWhatsappOptin] = useState<boolean>(
    customer.whatsappOptin ?? true
  )
  const [isUpdating, setIsUpdating] = useState(false)
  const [messageHistory, setMessageHistory] = useState<CustomerMessageDetail[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  // Ref para rastrear se a mudança foi feita pelo usuário (evita sincronização que reverte a mudança visual)
  const userChangedRef = useRef<boolean>(false)

  // Sincronizar estado quando customer.whatsappOptin mudar (apenas se não foi mudança do usuário)
  useEffect(() => {
    if (!isUpdating && !userChangedRef.current) {
      const newValue = customer.whatsappOptin ?? true
      if (whatsappOptin !== newValue) {
        setWhatsappOptin(newValue)
      }
    }
    // Resetar flag quando customer prop mudar (após query ser refeita)
    if (userChangedRef.current && customer.whatsappOptin === whatsappOptin) {
      userChangedRef.current = false
    }
  }, [customer.whatsappOptin, isUpdating, whatsappOptin])

  // Buscar histórico de mensagens
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedCompany?.id) return

      setLoadingMessages(true)
      try {
        const response = await customerService.getCustomerMessageHistory(
          selectedCompany.id,
          customer.id,
          {
            page: 1,
            limit: 10,
            orderDirection: 'desc',
          }
        )
        setMessageHistory(response.data)
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error)
        toaster.create({
          title: 'Erro',
          description: 'Não foi possível carregar o histórico de mensagens.',
          type: 'error',
        })
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchMessages()
  }, [customer.id, selectedCompany?.id])

  const handleOptinChange = async (checked: boolean) => {
    if (!selectedCompany?.id) {
      toaster.create({
        title: 'Erro',
        description: 'Empresa não selecionada',
        type: 'error',
      })
      return
    }
    
    // Marcar que a mudança foi feita pelo usuário
    userChangedRef.current = true
    setIsUpdating(true)
    // Atualiza o estado imediatamente para feedback visual
    setWhatsappOptin(checked)
    
    try {
      await customerService.updateWhatsappOptin(
        selectedCompany.id,
        customer.id,
        checked
      )
      
      // Invalidar queries para atualizar a UI automaticamente
      invalidateQueries.customersList(selectedCompany.id)
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(customer.id),
      })
      
      toaster.create({
        title: 'Sucesso',
        description: 'Preferência de WhatsApp atualizada',
        type: 'success',
      })
    } catch (error) {
      // Reverte o estado em caso de erro
      userChangedRef.current = false
      setWhatsappOptin(!checked)
      
      const errorMessage = 
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Não foi possível atualizar a preferência'
      
      toaster.create({
        title: 'Erro',
        description: errorMessage,
        type: 'error',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Flex
      flexDirection="column"
      gap={5}
    >
      {/* Card: Consentimento WhatsApp */}
      <Card.Root>
        <Card.Body>
          <Flex
            alignItems="center"
            gap={4}
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <Box flex={1}>
              <Flex
                alignItems="center"
                gap={2}
                mb={1}
              >
                <Icon
                  as={RiWhatsappLine}
                  boxSize={4}
                  color="green.500"
                />
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  Receber comunicações via WhatsApp
                </Text>
              </Flex>
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                O cliente pode optar por não receber comunicações no WhatsApp.
              </Text>
            </Box>
            <Field.Root>
              <Switch.Root
                aria-checked={whatsappOptin}
                aria-label="Consentimento para receber comunicações pelo WhatsApp"
                checked={whatsappOptin}
                colorPalette="green"
                disabled={isUpdating}
                onCheckedChange={({ checked }) => handleOptinChange(checked)}
                role="switch"
              >
                <Switch.HiddenInput />
                <Switch.Control />
                <Switch.Label fontSize="sm">
                  {whatsappOptin ? 'Ativado' : 'Desativado'}
                </Switch.Label>
              </Switch.Root>
            </Field.Root>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* Card: Histórico de Mensagens */}
      <Card.Root>
        <Card.Body>
          <Flex
            alignItems="center"
            gap={3}
            mb={5}
          >
            <Box
              bg="yellow.100"
              borderRadius="lg"
              color="yellow.600"
              p={2}
              _dark={{ bg: 'yellow.900' }}
            >
              <Icon
                as={RiMessageLine}
                boxSize={4}
              />
            </Box>
            <Box flex={1}>
              <Text
                fontSize="md"
                fontWeight="semibold"
              >
                Histórico de Mensagens
              </Text>
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                Últimas comunicações enviadas ao cliente
              </Text>
            </Box>
          </Flex>

          {loadingMessages ? (
            <LoadingState />
          ) : messageHistory.length > 0 ? (
            <VStack
              alignItems="stretch"
              gap={3}
            >
              {messageHistory.slice(0, 1).map((message, index) => {
                const PlatformIcon = platformIcons[message.platform]
                const platformColor = platformColors[message.platform]
                const statusColor = statusColors[message.status]

                return (
                  <Box
                    key={message.id}
                    bg={index === 0 ? 'bg.muted' : 'bg'}
                    borderColor={index === 0 ? 'yellow.200' : 'border'}
                    borderRadius="lg"
                    borderWidth="1px"
                    p={4}
                    position="relative"
                    transition="border-color 0.15s"
                    _hover={{ borderColor: 'yellow.300' }}
                  >
                    {index === 0 && (
                      <Badge
                        colorPalette="yellow"
                        position="absolute"
                        right={3}
                        size="sm"
                        top={-2.5}
                        variant="solid"
                      >
                        Mais recente
                      </Badge>
                    )}

                    <Flex gap={3}>
                      <Box
                        alignItems="center"
                        bg={`${platformColor}.100`}
                        borderRadius="lg"
                        color={`${platformColor}.600`}
                        display="flex"
                        flexShrink={0}
                        h="36px"
                        justifyContent="center"
                        w="36px"
                        _dark={{ bg: `${platformColor}.900`, color: `${platformColor}.300` }}
                      >
                        <Icon
                          as={PlatformIcon}
                          boxSize={4}
                        />
                      </Box>

                      <VStack
                        alignItems="flex-start"
                        flex={1}
                        gap={1.5}
                      >
                        <Flex
                          alignItems="center"
                          gap={2}
                          justifyContent="space-between"
                          w="100%"
                        >
                          <HStack gap={2}>
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                            >
                              {message.platformName}
                            </Text>
                            <Badge
                              colorPalette={statusColor}
                              size="sm"
                              variant="subtle"
                            >
                              {message.statusLabel}
                            </Badge>
                          </HStack>
                          <Text
                            color="fg.muted"
                            fontSize="xs"
                          >
                            {convertISOToDate(message.sentAt, {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </Flex>

                        {message.platform === 'whatsapp' && message.phone && (
                          <Text
                            color="fg.muted"
                            fontSize="xs"
                          >
                            {formatTelefone(message.phone)}
                          </Text>
                        )}

                        <Text
                          color="fg.muted"
                          fontSize="sm"
                          lineHeight="1.6"
                        >
                          {message.content}
                        </Text>

                        {message.mediaUrl && (
                          <Box mt={1}>
                            <ZoomableImage
                              alt={message.content}
                              src={convertLinkToResizedImage(message.mediaUrl)}
                            />
                          </Box>
                        )}
                      </VStack>
                    </Flex>
                  </Box>
                )
              })}
            </VStack>
          ) : (
            <Flex
              alignItems="center"
              flexDirection="column"
              gap={2}
              py={8}
            >
              <Icon
                as={RiMessageLine}
                boxSize={8}
                color="fg.subtle"
              />
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Nenhuma mensagem enviada ainda
              </Text>
            </Flex>
          )}

          {messageHistory.length > 0 && (
            <Box
              borderColor="border"
              borderTopWidth="1px"
              mt={4}
              pt={4}
              textAlign="center"
            >
              <Text
                color="yellow.500"
                cursor="pointer"
                fontSize="sm"
                fontWeight="medium"
                onClick={() => setIsTimelineOpen(true)}
                _hover={{ color: 'yellow.600', textDecoration: 'underline' }}
              >
                Ver todas as mensagens →
              </Text>
            </Box>
          )}
        </Card.Body>
      </Card.Root>

      <MessageTimelineModal
        customerName={customer.name}
        isOpen={isTimelineOpen}
        messages={messageHistory}
        onClose={() => setIsTimelineOpen(false)}
      />
    </Flex>
  )
}
