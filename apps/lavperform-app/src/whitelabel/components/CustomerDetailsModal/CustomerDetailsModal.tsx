import {
  Avatar,
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Icon,
  Portal,
  Tabs,
  Text,
  useTabs,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { RiSaveLine, RiWhatsappLine } from 'react-icons/ri'
import { FiTrash2 } from 'react-icons/fi'

import { getInitials, formatClientSince } from '@/utils/strings'
import { formatTelefone } from '@/utils/mask'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { DeleteConfirmationDialog } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useDeleteCustomer } from '@/hooks/queries/useCustomers'
import { toaster } from '@/components/ui/toaster'

import { BehaviorTab } from './components/BehaviorTab'
import { CommunicationTab } from './components/CommunicationTab'
import { ConfigurationsTab } from './components/ConfigurationsTab'
import { HistoryTab } from './components/HistoryTab'
import { SegmentsTab } from './components/SegmentsTab'
import type { Props } from './CustomerDetailsModal.types'

export function CustomerDetailsModal({ data, isOpen, onClose }: Props) {
  const { selectedCompany } = useAuth()
  const deleteCustomerMutation = useDeleteCustomer()

  const tabs = useTabs({
    defaultValue: 'behavior',
  })

  const isActive = useMemo(() => {
    return data?.whatsappOptin ?? true
  }, [data])

  // Formatar informações do cliente (primeiro pedido ou data de criação)
  const clientSince = useMemo(() => {
    const baseDate = data?.firstOrderDate ?? data?.createdAt
    return formatClientSince(baseDate)
  }, [data?.firstOrderDate, data?.createdAt])

  const customerId = useMemo(() => {
    return data?.id ? `#${data.id.slice(-5)}` : ' '
  }, [data?.id])

  const initials = useMemo(() => {
    return data?.name ? getInitials(data.name) : '??'
  }, [data?.name])

  // Formatar telefone
  const formattedPhone = useMemo(() => {
    return data?.phone ? formatTelefone(data.phone) : ' '
  }, [data?.phone])

  // Formatar data de nascimento
  const formattedBirthDate = useMemo(() => {
    if (!data?.birthDate) return ' '
    return convertISOToDate(data.birthDate, {
      timeZone: 'UTC',
    })
  }, [data?.birthDate])

  // Validar status do WhatsApp
  const whatsappStatus = useMemo(() => {
    if (!data?.whatsappOptin) {
      return { isValid: false, label: 'Inativo' }
    }
    // Validação básica: telefone deve ter pelo menos 10 dígitos (sem formatação)
    const phoneDigits = data.phone?.replace(/\D/g, '') || ''
    const hasValidPhone = phoneDigits.length >= 10
    return {
      isValid: hasValidPhone,
      label: hasValidPhone ? 'Ativo' : 'Inativo',
    }
  }, [data?.whatsappOptin, data?.phone])

  if (!data) {
    return null
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCompany?.id || !data.id) return

    try {
      await deleteCustomerMutation.mutateAsync({
        companyId: selectedCompany.id,
        customerId: data.id,
      })

      toaster.create({
        title: 'Cliente deletado com sucesso',
        type: 'success',
      })

      onClose()
    } catch (error: any) {
      toaster.create({
        title: 'Erro ao deletar cliente',
        description:
          error?.response?.data?.message || 'Tente novamente mais tarde',
        type: 'error',
      })
    }
  }

  // Footer
  const customFooter = (
    <Flex
      gap={2}
      justifyContent="space-between"
      w="100%"
    >
      <DeleteConfirmationDialog
        description="Esta ação não pode ser desfeita. O cliente será removido permanentemente."
        isLoading={deleteCustomerMutation.isPending}
        onClick={handleDeleteCustomer}
        title="Tem certeza que deseja excluir este cliente?"
        trigger={
          <Button
            colorPalette="red"
            variant="outline"
          >
            <FiTrash2 />
            Excluir Cliente
          </Button>
        }
      />

      <Flex gap={2}>
        {tabs.value === 'configurations' && (
          <Button
            colorPalette="yellow"
            form="data-form"
            type="submit"
          >
            <RiSaveLine />
            Salvar Alterações
          </Button>
        )}
      </Flex>
    </Flex>
  )

  // Conteúdo completo com header e tabs
  const content = (
    <>
      {/* Header customizado */}
      <Box
        bg="bg.muted"
        borderBottomWidth="1px"
        p={6}
      >
        <Flex
          alignItems="center"
          flexDirection={{ base: 'column', sm: 'row' }}
          gap={4}
          justifyContent="space-between"
        >
          <Flex
            alignItems="center"
            gap={4}
          >
            {/* Avatar */}
            <Avatar.Root
              bg="yellow.500"
              color="white"
              size="lg"
            >
              {data.avatarUrl && (
                <Avatar.Image
                  alt={data.name}
                  src={data.avatarUrl}
                />
              )}
              <Avatar.Fallback name={data.name}>{initials}</Avatar.Fallback>
            </Avatar.Root>

            {/* Informações do cliente */}
            <Box>
              <Flex
                alignItems="center"
                gap={2}
                mb={1}
              >
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                >
                  {data.name}
                </Text>
                {/* <Badge
                  colorPalette={isActive ? 'green' : 'red'}
                  variant="solid"
                >
                  {isActive ? (
                    <>
                      <Box
                        as="span"
                        bg="white"
                        borderRadius="full"
                        display="inline-block"
                        h="6px"
                        mr={1}
                        w="6px"
                      />
                      Ativo
                    </>
                  ) : (
                    'Inativo'
                  )}
                </Badge> */}
                <Badge
                  colorPalette={whatsappStatus.isValid ? 'green' : 'red'}
                  variant="solid"
                  size="md"
                >
                  {whatsappStatus.label}
                </Badge>
                <Badge
                  colorPalette={data.whatsappVerified ? 'green' : 'red'}
                  variant="solid"
                  size="md"
                >
                  <Icon
                    as={RiWhatsappLine}
                    mb={0}
                  />
                  {data.whatsappVerified
                    ? 'WhatsApp Verificado'
                    : 'WhatsApp Inválido'}
                </Badge>
              </Flex>
              <Text
                color="fg.muted"
                fontSize="sm"
                mb={1}
              >
                {clientSince
                  ? `Cliente desde ${clientSince}`
                  : 'Cliente desde  '}
              </Text>
              {/* Email */}
              {data.email && (
                <Text
                  color="fg.muted"
                  fontSize="sm"
                  mb={0.5}
                >
                  {data.email}
                </Text>
              )}
              {/* Telefone */}
              {/* {formattedPhone !== ' ' && (
                <Text
                  color="gray.600"
                  fontSize="sm"
                  mb={1}
                >
                  {formattedPhone}
                </Text>
              )} */}
              {/* Badges: Origem e Data de Nascimento */}
              <Flex
                alignItems="center"
                flexWrap="wrap"
                gap={2}
                mt={1}
              >
                {data.origin && (
                  <Badge
                    colorPalette="blue"
                    variant="subtle"
                  >
                    {data.origin}
                  </Badge>
                )}
              </Flex>
            </Box>
          </Flex>
        </Flex>
      </Box>

      {/* Conteúdo com tabs */}
      <Box p={6}>
        <Tabs.RootProvider value={tabs}>
          <Tabs.List mb={6}>
            <Tabs.Trigger value="behavior">Comportamento</Tabs.Trigger>
            <Tabs.Trigger value="configurations">Dados Pessoais</Tabs.Trigger>
            <Tabs.Trigger value="communication">Comunicação</Tabs.Trigger>
            {/* <Tabs.Trigger value="segments">Segmentos</Tabs.Trigger> */}
            {/* <Tabs.Trigger value="history">Linha do tempo</Tabs.Trigger> */}
          </Tabs.List>

          <Tabs.Content value="behavior">
            <BehaviorTab customer={data} />
          </Tabs.Content>

          <Tabs.Content value="communication">
            <CommunicationTab customer={data} />
          </Tabs.Content>

          <Tabs.Content value="segments">
            <SegmentsTab customerId={data.id} />
          </Tabs.Content>

          <Tabs.Content value="history">
            <HistoryTab customerId={data.id} />
          </Tabs.Content>

          <Tabs.Content value="configurations">
            <ConfigurationsTab customer={data} />
          </Tabs.Content>
        </Tabs.RootProvider>
      </Box>
    </>
  )

  const [open, setOpen] = useState(isOpen)

  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  const handleOpenChange = (e: { open: boolean }) => {
    setOpen(e.open)
    if (!e.open) {
      onClose()
    }
  }

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      onOpenChange={handleOpenChange}
      open={open}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW={{ base: '95vw', md: '90vw', lg: '85vw', xl: '1200px' }}
            overflow="hidden"
            w="full"
          >
            <Dialog.CloseTrigger asChild>
              <CloseButton
                aria-label="Fechar modal"
                variant="subtle"
              />
            </Dialog.CloseTrigger>
            {content}
            <Dialog.Footer
              bg="bg.muted"
              borderTopWidth="1px"
              py={4}
            >
              {customFooter}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
