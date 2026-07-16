import {
  Box,
  Button,
  Dialog,
  Flex,
  Icon,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RiWhatsappLine } from 'react-icons/ri'
import { useLocation } from 'react-router-dom'

import { ConnectWhatsAppButton } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useMetaIntegrationAvailability } from '@/hooks/queries'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'
import { useWhatsAppWebChannel } from '@/hooks/useWhatsAppWebChannel'

const IGNORE_DURATION = 24 * 60 * 60 * 1000 // 24 horas em milissegundos
const STORAGE_KEY = 'whatsapp-disconnected-modal-ignore-until'

export const WhatsAppDisconnectedAlert = () => {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const { isConnected: isLegacyConnected, isLoading: isLoadingLegacy } =
    useWhatsAppManager(companyId)
  const { isConnected: isWebConnected, isLoading: isLoadingWeb } =
    useWhatsAppWebChannel(companyId)
  const { data: metaAvailability, isLoading: isLoadingMeta } =
    useMetaIntegrationAvailability(companyId)
  const location = useLocation()

  const isBusinessApiActive =
    metaAvailability?.available === true ||
    metaAvailability?.status === 'ACTIVE'
  const isLoadingStatus =
    isLoadingLegacy || isLoadingWeb || isLoadingMeta
  const hasActiveWhatsAppChannel =
    isLegacyConnected || isWebConnected || isBusinessApiActive

  const [isOpen, setIsOpen] = useState(false)

  const shouldShowModal = useCallback(() => {
    if (isLoadingStatus) {
      return false
    }

    if (hasActiveWhatsAppChannel) {
      return false
    }

    const ignoreUntil = localStorage.getItem(STORAGE_KEY)
    if (ignoreUntil) {
      const ignoreTime = parseInt(ignoreUntil, 10)
      if (Date.now() < ignoreTime) {
        return false
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    return true
  }, [hasActiveWhatsAppChannel, isLoadingStatus])

  const shouldShowModalRef = useRef(shouldShowModal)
  shouldShowModalRef.current = shouldShowModal

  const handleIgnore = () => {
    const ignoreUntil = Date.now() + IGNORE_DURATION
    localStorage.setItem(STORAGE_KEY, ignoreUntil.toString())
    setIsOpen(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleConnected = () => {
    setIsOpen(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  useEffect(() => {
    setIsOpen(false)
  }, [companyId])

  useEffect(() => {
    if (!shouldShowModal() || !selectedCompany) return

    const timer = setTimeout(() => {
      if (shouldShowModalRef.current()) {
        setIsOpen(true)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [location.pathname, selectedCompany, shouldShowModal])

  useEffect(() => {
    if (hasActiveWhatsAppChannel) {
      setIsOpen(false)
    }
  }, [hasActiveWhatsAppChannel])

  if (!selectedCompany || import.meta.env.VITE_ENVIROMENT === 'development') {
    return null
  }

  return (
    <Dialog.Root
      onOpenChange={(details) => {
        if (!details.open) {
          handleClose()
        }
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
                <Icon
                  as={RiWhatsappLine}
                  h={7}
                  mr={3}
                  w={7}
                />
                WhatsApp Desconectado
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Flex
                align="center"
                direction="column"
                gap={2}
              >
                <Text
                  fontSize="md"
                  fontWeight="normal"
                >
                  O seu WhatsApp está desconectado.
                  <br />
                  Para que as campanhas funcionem corretamente, reconecte!
                </Text>
              </Flex>
              <Stack
                direction="row"
                gap={2}
                justify="center"
                mt={6}
              >
                <Button
                  onClick={handleIgnore}
                  size={'sm'}
                  variant="outline"
                >
                  Ignorar por 24h
                </Button>
                <ConnectWhatsAppButton
                  onConnected={handleConnected}
                  trigger={
                    <Box
                      _hover={{ bg: 'primary' }}
                      bg="primary"
                      color="black"
                    >
                      Conectar WhatsApp
                    </Box>
                  }
                />
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
