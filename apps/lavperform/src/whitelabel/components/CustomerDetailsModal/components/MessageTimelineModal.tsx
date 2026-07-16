import {
  Badge,
  Box,
  CloseButton,
  Dialog,
  Flex,
  HStack,
  Icon,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  RiMailLine,
  RiMessageLine,
  RiPhoneLine,
  RiWhatsappLine,
} from 'react-icons/ri'
import { SiIfood } from 'react-icons/si'
import { MdRestaurantMenu } from 'react-icons/md'

import type { CustomerMessageDetail } from '@/types'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { formatTelefone } from '@/utils/mask'
import { ZoomableImage } from '@/components'
import { convertLinkToResizedImage } from '@/firebase/storage'

type Props = {
  isOpen: boolean
  onClose: () => void
  messages: CustomerMessageDetail[]
  customerName: string
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

export function MessageTimelineModal({
  isOpen,
  onClose,
  messages,
  customerName,
}: Props) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size={{ base: 'md', md: 'xl' }}
      placement="center"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxH="80vh"
            maxW={{ base: '95vw', md: '800px' }}
            borderRadius="lg"
            overflow="hidden"
          >
            <Dialog.Header pb={4}>
              <Flex
                alignItems="center"
                gap={3}
              >
                <Box
                  bg="yellow.500"
                  borderRadius="lg"
                  color="white"
                  display={{ base: 'none', sm: 'flex' }}
                  p={2}
                >
                  <Icon
                    as={RiMessageLine}
                    boxSize={5}
                  />
                </Box>
                <Box flex={1}>
                  <Dialog.Title fontSize={{ base: 'lg', md: 'xl' }}>
                    Linha do Tempo de Mensagens
                  </Dialog.Title>
                  <Text
                    color="fg.muted"
                    display={{ base: 'none', sm: 'block' }}
                    fontSize="sm"
                    fontWeight="normal"
                  >
                    Histórico completo de comunicações com {customerName}
                  </Text>
                </Box>
              </Flex>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <CloseButton
                aria-label="Fechar"
                size={{ base: 'sm', md: 'md' }}
                variant="subtle"
              />
            </Dialog.CloseTrigger>

            <Dialog.Body
              overflowY="auto"
              px={{ base: 3, md: 6 }}
            >
              {/* Timeline vertical */}
              <Box
                position="relative"
                py={4}
              >
                {/* Linha vertical central */}
                <Box
                  bg="gray.400"
                  display={{ base: 'none', sm: 'block' }}
                  h="calc(100% - 60px)"
                  left={{ base: '18px', sm: '21px' }}
                  position="absolute"
                  top="30px"
                  w="2px"
                  zIndex={0}
                />

                {/* Mensagens */}
                <VStack
                  alignItems="stretch"
                  gap={{ base: 4, md: 6 }}
                  position="relative"
                  zIndex={1}
                >
                  {messages.map((message, index) => {
                    const PlatformIcon = platformIcons[message.platform]
                    const platformColor = platformColors[message.platform]
                    const statusColor = statusColors[message.status]

                    return (
                      <Flex
                        key={message.id}
                        gap={{ base: 3, md: 4 }}
                        position="relative"
                      >
                        {/* Ícone da plataforma (ponto na timeline) */}
                        <Box
                          alignItems="center"
                          bg={`${platformColor}.100`}
                          border={{ base: '2px solid', sm: '3px solid' }}
                          borderColor="white"
                          borderRadius="full"
                          color={`${platformColor}.600`}
                          display="flex"
                          flexShrink={0}
                          h={{ base: '40px', sm: '44px' }}
                          justifyContent="center"
                          position="relative"
                          w={{ base: '40px', sm: '44px' }}
                          zIndex={2}
                        >
                          <Icon
                            as={PlatformIcon}
                            boxSize={{ base: 4, sm: 5 }}
                          />
                        </Box>

                        {/* Conteúdo da mensagem */}
                        <Box
                          bg={index === 0 ? 'bg.muted' : 'bg.muted'}
                          borderColor={index === 0 ? 'yellow.200' : 'black'}
                          borderRadius="lg"
                          borderWidth="1px"
                          flex={1}
                          p={{ base: 3, md: 4 }}
                          position="relative"
                          transition="all 0.2s"
                          _hover={{
                            borderColor: 'yellow.300',
                          }}
                        >
                          {/* Badge "Mais recente" */}
                          {index === 0 && (
                            <Badge
                              colorPalette="yellow"
                              display={{ base: 'none', sm: 'inline-flex' }}
                              position="absolute"
                              right={3}
                              size={{ base: 'xs', sm: 'sm' }}
                              top={-2}
                              variant="solid"
                            >
                              Mais recente
                            </Badge>
                          )}

                          {/* Header: Plataforma, Status e Data */}
                          <Flex
                            alignItems={{ base: 'flex-start', sm: 'center' }}
                            flexDirection={{ base: 'column', sm: 'row' }}
                            gap={{ base: 2, sm: 0 }}
                            justifyContent="space-between"
                            mb={3}
                          >
                            <HStack gap={2}>
                              <Text
                                color="fg.muted"
                                fontSize={{ base: 'xs', sm: 'sm' }}
                                fontWeight="bold"
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
                              color="gray.500"
                              fontSize={{ base: '2xs', sm: 'xs' }}
                              fontWeight="medium"
                            >
                              {convertISOToDate(message.sentAt, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </Flex>

                          {/* Número de WhatsApp */}
                          {message.platform === 'whatsapp' && message.phone && (
                            <Text
                              color="fg.muted"
                              fontSize={{ base: '2xs', sm: 'xs' }}
                              mb={2}
                            >
                              {formatTelefone(message.phone)}
                            </Text>
                          )}

                          {/* Conteúdo da mensagem */}
                          <Text
                            color="fg.muted"
                            fontSize={{ base: 'xs', sm: 'sm' }}
                            lineHeight="1.6"
                          >
                            {message.content}
                          </Text>

                          {/* Imagem da mensagem */}
                          {message.mediaUrl && (
                            <Box mt={3}>
                              <ZoomableImage
                                alt={message.content}
                                src={convertLinkToResizedImage(message.mediaUrl)}
                              />
                            </Box>
                          )}
                        </Box>
                      </Flex>
                    )
                  })}
                </VStack>

                {/* Indicador de fim da timeline - CORRIGIDO */}
                <Flex
                  alignItems="center"
                  gap={{ base: 3, md: 4 }}
                  mt={6}
                  opacity={0.5}
                  pl={{ base: 0, sm: 0 }}
                >
                  <Box
                    bg="bg.inverted"
                    borderRadius="full"
                    flexShrink={0}
                    h={{ base: '10px', sm: '12px' }}
                    ml={{ base: '15px', sm: '16px' }}
                    w={{ base: '10px', sm: '12px' }}
                  />
                  <Text
                    color="fg.muted"
                    fontSize={{ base: '2xs', sm: 'xs' }}
                    fontStyle="italic"
                  >
                    Início do histórico
                  </Text>
                </Flex>
              </Box>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
