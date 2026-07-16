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
import { memo, useCallback, useEffect, useState } from 'react'
import { RiWhatsappLine } from 'react-icons/ri'

import { toaster } from '@/components'
import { useImportWhatsAppCustomers, useWhatsAppCustomers } from '@/hooks/queries'
import type { WhatsAppCustomer } from '@/types'
import { formatTelefone } from '@/utils/mask'

import { WhatsAppCustomersTab } from './components/WhatsAppCustomersTab'
import { Props } from './ImportWhatsAppCustomersModal.types'

function ImportWhatsAppCustomersModalBase({
  isOpen,
  onClose,
  companyId,
}: Props) {
  const tabs = useTabs({
    defaultValue: 'whatsapp',
  })

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [totalProcessed, setTotalProcessed] = useState(0)

  const importMutation = useImportWhatsAppCustomers()
  const { data: whatsAppData } = useWhatsAppCustomers(companyId)
  const profileInfo = whatsAppData?.profileInfo

  const BATCH_SIZE = 150 

  if (!companyId) {
    return null
  }

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const processBatch = useCallback(
    async (
      customers: WhatsAppCustomer[],
      startIndex: number,
      batchSize: number,
      totalCustomers: number,
      currentProcessed: number
    ) => {
      const endIndex = Math.min(startIndex + batchSize, customers.length)
      const batch = customers.slice(startIndex, endIndex)

      await importMutation.mutateAsync({
        companyId: companyId!,
        customers: batch,
      })

      const newProcessed = currentProcessed + batch.length
      setTotalProcessed(newProcessed)
      setImportProgress((newProcessed / totalCustomers) * 100)
    },
    [companyId, importMutation]
  )

  const handleImport = useCallback(async () => {
    if (selectedIds.length === 0 || !companyId || isImporting) return

    setIsImporting(true)
    setImportProgress(0)
    setTotalProcessed(0)

    try {
      // Buscar os clientes completos usando os IDs selecionados
      const allCustomers = whatsAppData?.data || []
      const selectedCustomers = allCustomers.filter((customer) =>
        selectedIds.includes(customer.id)
      )

      const totalBatches = Math.ceil(selectedCustomers.length / BATCH_SIZE)
      let currentProcessed = 0

      // Processar em lotes
      for (let i = 0; i < totalBatches; i++) {
        await processBatch(
          selectedCustomers,
          i * BATCH_SIZE,
          BATCH_SIZE,
          selectedCustomers.length,
          currentProcessed
        )
        currentProcessed += Math.min(
          BATCH_SIZE,
          selectedCustomers.length - i * BATCH_SIZE
        )
      }

      toaster.create({
        title: 'Sucesso',
        description: `${selectedIds.length} cliente(s) importado(s) com sucesso!`,
        type: 'success',
      })

      // Resetar seleções e fechar modal
      setSelectedIds([])
      onClose()
    } catch (error) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error as { message?: string })?.message ||
        'Não foi possível importar os clientes'

      const successCount = totalProcessed > 0 ? totalProcessed : 0
      const errorDescription =
        successCount > 0
          ? `${errorMessage}. ${successCount} de ${selectedIds.length} cliente(s) foram importados antes do erro.`
          : errorMessage

      toaster.create({
        title: 'Erro',
        description: errorDescription,
        type: 'error',
      })
    } finally {
      setIsImporting(false)
      setImportProgress(0)
      setTotalProcessed(0)
    }
  }, [
    selectedIds,
    companyId,
    isImporting,
    importMutation,
    onClose,
    whatsAppData,
    processBatch,
    totalProcessed,
  ])

  // Resetar seleções e progresso quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([])
      setImportProgress(0)
      setTotalProcessed(0)
    }
  }, [isOpen])

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

  // Footer customizado
  const customFooter = (
    <Flex
      flexDirection="column"
      gap={3}
      w="100%"
    >
      {/* Indicador de progresso */}
      {isImporting && selectedIds.length > 0 && (
        <Flex
          flexDirection="column"
          gap={2}
          w="100%"
        >
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Processando {totalProcessed} de {selectedIds.length} clientes
          </Text>
          <Box
            bg="bg.muted"
            borderRadius="md"
            h="8px"
            overflow="hidden"
            w="100%"
          >
            <Box
              bg="green.500"
              h="100%"
              transition="width 0.3s ease"
              w={`${importProgress}%`}
            />
          </Box>
        </Flex>
      )}
      <Flex
        alignItems={{ base: 'stretch', sm: 'center' }}
        flexDirection={{ base: 'column', sm: 'row' }}
        gap={3}
        justifyContent="space-between"
        w="100%"
      >
        {selectedIds.length > 0 && (
          <Flex
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Text
              fontSize="sm"
              fontWeight="medium"
            >
              Total de clientes selecionados:
            </Text>
            <Badge
              colorPalette="green"
              fontSize="md"
              variant="solid"
            >
              {selectedIds.length}
            </Badge>
          </Flex>
        )}

        <Flex
          flexDirection={{ base: 'column-reverse', sm: 'row' }}
          gap={2}
          justifyContent="flex-end"
          w={{ base: '100%', sm: 'auto' }}
        >
          <Button
            disabled={isImporting}
            onClick={onClose}
            variant="outline"
            w={{ base: '100%', sm: 'auto' }}
          >
            Cancelar
          </Button>
          <Button
            colorPalette="green"
            disabled={selectedIds.length === 0 || isImporting}
            loading={isImporting}
            onClick={handleImport}
            w={{ base: '100%', sm: 'auto' }}
          >
            <RiWhatsappLine />
            Importar {selectedIds.length > 0 && `${selectedIds.length} `}
            {selectedIds.length === 1 ? 'cliente' : 'clientes'}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )

  // Conteúdo completo com header e tabs
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      h="100%"
      overflow="hidden"
      position="relative"
      zIndex={2}
    >
      {/* Header customizado */}
      <Box
        bg="bg.muted"
        borderBottomWidth="1px"
        flexShrink={0}
        p={6}
      >
        {/* Primeira linha: Título e ícone WhatsApp */}
        <Flex
          alignItems="center"
          gap={4}
          mb={4}
        >
           {/* Ícone WhatsApp */}
           <Box
            bg="green.500"
            borderRadius="lg"
            color="white"
            display="flex"
            p={2}
          >
            <Icon
              as={RiWhatsappLine}
              boxSize={6}
            />
          </Box>
          <Box flex={1}>
            <Text
              fontSize="xl"
              fontWeight="bold"
            >
              Importar Clientes do WhatsApp
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Selecione os clientes que deseja importar para sua base
            </Text>
          </Box>
          
         
        </Flex>
        
        {/* Segunda linha: Avatar e informações do perfil */}
        <Flex
          alignItems="center"
          gap={4}
        >
          {/* Avatar do perfil */}
          <Avatar.Root size="md">
            <Avatar.Image
              alt={profileInfo?.profileName}
              src={profileInfo?.profilePic}
            />
            <Avatar.Fallback name={profileInfo?.profileName} />
          </Avatar.Root>
          
          {/* Informações do perfil */}
          <Box>
            <Text
              fontSize="sm"
              color="fg.muted"
            >
              Contatos de {profileInfo?.profileName || 'WhatsApp'}
            </Text>
            <Text
              fontSize="xs"
              color="fg.muted"
            >
              {profileInfo?.phoneNumber
                ? formatTelefone(profileInfo.phoneNumber)
                : ' '}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Conteúdo com tabs */}
      <Box
        display="flex"
        flex={1}
        flexDirection="column"
        minH={0}
        overflow="hidden"
        p={6}
      >
        <Tabs.RootProvider value={tabs}>
          <Tabs.List
            flexShrink={0}
            mb={6}
          >
            <Tabs.Trigger value="whatsapp">Clientes do WhatsApp</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content
            display="flex"
            flex={1}
            flexDirection="column"
            minH={0}
            overflow="hidden"
            value="whatsapp"
          >
            <WhatsAppCustomersTab
              companyId={companyId}
              onSelectionChange={handleSelectionChange}
            />
          </Tabs.Content>
        </Tabs.RootProvider>
      </Box>
    </Box>
  )

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
            display="flex"
            flexDirection="column"
            maxH={{ base: '90vh', md: '85vh' }}
            maxW={{ base: '95vw', md: '90vw', lg: '85vw', xl: '1400px' }}
            overflow="hidden"
            w="full"
          >
            <Dialog.CloseTrigger asChild>
              <CloseButton
                aria-label="Fechar modal"
                variant="subtle"
                zIndex={3}
              />
            </Dialog.CloseTrigger>
            {content}
            <Dialog.Footer
              bg="bg.muted"
              borderTopWidth="1px"
              flexShrink={0}
              position="relative"
              py={4}
              zIndex={1}
            >
              {customFooter}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const ImportWhatsAppCustomersModal = memo(
  ImportWhatsAppCustomersModalBase
) as typeof ImportWhatsAppCustomersModalBase

export { ImportWhatsAppCustomersModal }
