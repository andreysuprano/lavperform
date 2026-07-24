import {
  Badge,
  Box,
  Button,
  Clipboard,
  Flex,
  IconButton,
  Image,
  Input,
  InputGroup,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import Barcode from 'react-barcode'

import { CustomDrawer, CustomTable, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { type PaymentDetails, paymentService } from '@/services'
import { logger } from '@/utils/logger'

import { Props } from './InvoiceDetailsDrawer.types'

const statusMap: Record<string, string> = {
  ACTIVE: 'ATIVO',
  PENDING: 'PENDENTE',
  CONFIRMED: 'CONFIRMADO',
  OVERDUE: 'ATRASADO',
  CANCELADO: 'CANCELADO',
  RECEIVED: 'PAGO',
  INACTIVE: 'INATIVO',
}

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green',
  PENDING: 'yellow',
  CONFIRMED: 'red',
  OVERDUE: 'orange',
  RECEIVED: 'green',
  CANCELADO: 'red',
  INACTIVE: 'gray',
}

const formatCurrency = (value: string | number) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(numValue || 0)
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return 'Data inválida'
  }
}

const formatCNPJ = (cnpj?: string) => {
  if (!cnpj) return 'N/A'
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length === 14) {
    return cleaned.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
  }
  return cnpj
}

function InvoiceDetailsDrawerComponent({
  data,
  company,
  onClose,
  allowBoleto = false,
  allowPix = false,
  planAllowsAlternativePayments = false,
  alternativePaymentLabel = 'Boleto/Pix',
}: Props) {
  const defaultTab = allowPix ? 'pix' : 'boleto'
  const [activeTab, setActiveTab] = useState<'pix' | 'boleto'>(defaultTab)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  )
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const { selectedCompany } = useAuth()

  const fetchPaymentDetails = useCallback(async () => {
    if (!data) return

    const isInvoice = !!data.invoiceNumber
    const isAlternativePayment = data.card === alternativePaymentLabel

    if (!selectedCompany?.id || !data.id) return

    if (!isInvoice || !isAlternativePayment || !planAllowsAlternativePayments) {
      setPaymentDetails(null)
      return
    }

    setIsLoadingDetails(true)
    try {
      const details = await paymentService.getPaymentDetails(
        selectedCompany.id,
        data.id
      )
      setPaymentDetails(details)
    } catch (error) {
      logger.error('Erro ao buscar detalhes do pagamento:', error)
      toaster.create({
        closable: true,
        description: 'Não foi possível carregar os detalhes do pagamento.',
        duration: 4000,
        title: 'Erro',
        type: 'error',
      })
      setPaymentDetails(null)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [
    selectedCompany?.id,
    data,
    alternativePaymentLabel,
    planAllowsAlternativePayments,
  ])

  useEffect(() => {
    fetchPaymentDetails()
  }, [fetchPaymentDetails])

  if (!data) return null

  const rawStatus = data.status
  const mappedStatus = statusMap[rawStatus] || rawStatus
  const color =
    statusColorMap[rawStatus] || statusColorMap[mappedStatus] || 'gray'
  const isAlternativePayment = data.card === alternativePaymentLabel

  const invoiceData = {
    number: data.id,
    issueDate: data.dateCreated,
    paymentDate: data.nextDueDate,
    client: {
      address: company?.address
        ? `${company.address.street}, ${company.address.number}   ${company.address.neighborhood}, ${company.address.city}/${company.address.state}   CEP: ${company.address.zipCode}`
        : 'Carregando endereço...',
      cnpj: company?.cnpj || '51.317.195/0001-39',
      name: company?.name || 'Nome do Estabelecimento',
    },
    paymentMethod: data.card,
    status: data.status,
    total: parseFloat(data.planPrice),
    items: [
      {
        description: data.planName,
        discount: 0,
        id: `item-${data.id}`,
        period: `${formatDate(data.dateCreated)} - ${formatDate(
          data.nextDueDate
        )}`,
        subtotal: parseFloat(data.planPrice),
        value: parseFloat(data.planPrice),
      },
    ],
  }

  const ClipboardIconButton = () => (
    <Clipboard.Trigger asChild>
      <IconButton
        aria-label="Copiar"
        me="-2"
        size="xs"
        variant="surface"
      >
        <Clipboard.Indicator />
      </IconButton>
    </Clipboard.Trigger>
  )

  const renderTabContent = () => {
    const isSubscriptionItem = !data.invoiceNumber
    const isCreditCardPayment = !isAlternativePayment

    if (isSubscriptionItem) {
      return (
        <Box
          bg="bg.muted"
          borderRadius="md"
          p={4}
        >
          <Text
            fontWeight="bold"
            mb={3}
          >
            Detalhes da Assinatura
          </Text>
          <Stack gap={2}>
            <Text fontSize="sm">
              <Text
                as="span"
                color="fg.muted"
              >
                Próxima data:
              </Text>{' '}
              {formatDate(invoiceData.paymentDate)}
            </Text>
            <Text fontSize="sm">
              <Text
                as="span"
                color="fg.muted"
              >
                Valor:
              </Text>{' '}
              {formatCurrency(invoiceData.total)}
            </Text>
          </Stack>
        </Box>
      )
    }

    if (isCreditCardPayment) {
      return (
        <Box
          bg="bg.muted"
          borderRadius="md"
          p={4}
        >
          <Text
            fontWeight="bold"
            mb={3}
          >
            {data.card === 'N/A'
              ? 'Pagamento pendente'
              : 'Pagamento via Cartão de Crédito'}
          </Text>
          <Stack gap={2}>
            {data.card === 'N/A' ? (
              <Text fontSize="sm">
                Cadastre um cartão de crédito para concluir o pagamento desta
                fatura.
              </Text>
            ) : (
              <Text fontSize="sm">
                Esta fatura foi paga (ou será debitada) usando o Cartão de
                Crédito:
                <Text
                  as="span"
                  fontWeight="semibold"
                >
                  {' '}
                  {data.card}
                </Text>
                .
              </Text>
            )}
            <Text fontSize="sm">
              <Text
                as="span"
                color="fg.muted"
              >
                Vencimento Original:
              </Text>{' '}
              {formatDate(invoiceData.paymentDate)}
            </Text>
            <Text fontSize="sm">
              <Text
                as="span"
                color="fg.muted"
              >
                Valor:
              </Text>{' '}
              {formatCurrency(invoiceData.total)}
            </Text>
          </Stack>
        </Box>
      )
    }

    if (isLoadingDetails) {
      return <Text>Carregando detalhes do pagamento...</Text>
    }

    if (activeTab === 'pix' && allowPix && paymentDetails?.pixQrCode) {
      return (
        <Box
          bg="bg.muted"
          borderRadius="md"
          p={4}
        >
          <Text
            fontWeight="bold"
            mb={4}
          >
            Pagamento via Pix
          </Text>
          <Stack gap={4}>
            <Image
              alt="QR Code Pix"
              borderRadius="md"
              maxW="200px"
              mx="auto"
              src={`data:image/png;base64,${paymentDetails.pixQrCode.encodedImage}`}
            />
            <Stack gap={2}>
              <Text
                fontSize="sm"
                fontWeight="medium"
              >
                Chave Pix (Código):
              </Text>
              <Clipboard.Root value={paymentDetails.pixQrCode.payload || ''}>
                <InputGroup endElement={<ClipboardIconButton />}>
                  <Clipboard.Input asChild>
                    <Input
                      disabled
                      value={paymentDetails.pixQrCode.payload}
                    />
                  </Clipboard.Input>
                </InputGroup>
              </Clipboard.Root>
            </Stack>
            <Flex
              align="center"
              bg="bg.emphasized"
              borderRadius="md"
              justify="space-between"
              p={3}
            >
              <Text fontSize="sm">Valor a pagar:</Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
              >
                {formatCurrency(invoiceData.total)}
              </Text>
            </Flex>
          </Stack>
        </Box>
      )
    }

    if (activeTab === 'boleto' && allowBoleto && paymentDetails?.barcode) {
      const barcodeValue = paymentDetails.barcode.barCode.replace(/\s/g, '')

      return (
        <Box
          bg="bg.muted"
          borderRadius="md"
          p={4}
        >
          <Text
            fontWeight="bold"
            mb={4}
          >
            Pagamento via Boleto Bancário
          </Text>

          <Stack gap={4}>
            <Box
              bg="bg"
              borderRadius="md"
              display={{ base: 'none', md: 'block' }}
              p={4}
              textAlign="center"
            >
              <Barcode
                displayValue={false}
                format="CODE128"
                height={50}
                value={barcodeValue}
                width={1.4}
              />
            </Box>

            <Stack gap={2}>
              <Text
                fontSize="sm"
                fontWeight="medium"
              >
                Linha Digitável:
              </Text>
              <Clipboard.Root value={paymentDetails.barcode.barCode || ''}>
                <InputGroup endElement={<ClipboardIconButton />}>
                  <Clipboard.Input asChild>
                    <Input
                      disabled
                      fontFamily="mono"
                      fontWeight="semibold"
                      value={paymentDetails.barcode.barCode}
                    />
                  </Clipboard.Input>
                </InputGroup>
              </Clipboard.Root>
            </Stack>

            <Flex
              align="center"
              bg="bg.emphasized"
              borderRadius="md"
              justify="space-between"
              p={3}
            >
              <Text fontSize="sm">Valor a pagar:</Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
              >
                {formatCurrency(invoiceData.total)}
              </Text>
            </Flex>
          </Stack>
        </Box>
      )
    }

    return (
      <Box
        bg="bg.muted"
        borderRadius="md"
        p={4}
      >
        <Text
          fontWeight="bold"
          mb={3}
        >
          {activeTab === 'pix'
            ? 'Pagamento via Pix'
            : 'Pagamento via Boleto Bancário'}
        </Text>
        <Stack gap={2}>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Dados de pagamento não disponíveis ou em processamento.
          </Text>
          <Text fontSize="sm">
            <Text
              as="span"
              color="fg.muted"
            >
              Vencimento:
            </Text>{' '}
            {formatDate(invoiceData.paymentDate)}
          </Text>
          <Text fontSize="sm">
            <Text
              as="span"
              color="fg.muted"
            >
              Valor a pagar:
            </Text>{' '}
            {formatCurrency(invoiceData.total)}
          </Text>
        </Stack>
      </Box>
    )
  }

  return (
    <CustomDrawer
      footer={
        <Button
          colorScheme="blue"
          onClick={onClose}
        >
          Fechar
        </Button>
      }
      isOpen={!!data}
      onExitComplete={onClose}
      title="Fatura"
    >
      <Box p={2}>
        <Box mb={6}>
          <Text
            fontSize="lg"
            fontWeight="bold"
            mb={2}
          >
            Status da Fatura
          </Text>
          <Badge
            borderRadius="MD"
            colorPalette={color}
            fontSize="lg"
            fontWeight="semibold"
            px={5}
            py={1}
          >
            {mappedStatus}
          </Badge>
        </Box>

        <Flex
          align="flex-start"
          direction={{ base: 'column', md: 'row' }}
          gap={4}
          justify="space-between"
          mb={6}
        >
          <Stack gap={2}>
            <Text fontSize="sm">
              <Text
                as="span"
                color="fg.muted"
              >
                Data de emissão:
              </Text>{' '}
              {formatDate(invoiceData.issueDate)}
            </Text>
            <Text fontSize="sm">
              <Text
                as="span"
                color="fg.muted"
              >
                Data de pagamento:
              </Text>{' '}
              {formatDate(invoiceData.paymentDate)}
            </Text>
          </Stack>
          <Stack
            alignItems="center"
            bg="bg.muted"
            borderRadius="md"
            gap={2}
            minW="140px"
            p={3}
            textAlign="center"
          >
            <Badge
              colorPalette="purple"
              fontSize="xs"
            >
              {invoiceData.paymentMethod}
            </Badge>
            <Text
              fontSize="2xl"
              fontWeight="bold"
            >
              {formatCurrency(invoiceData.total)}
            </Text>
          </Stack>
        </Flex>

        <Box
          bg="bg.muted"
          borderRadius="md"
          mb={6}
          p={4}
        >
          <Text
            fontSize="sm"
            fontWeight="semibold"
            mb={3}
          >
            Informações do Cliente
          </Text>
          <Stack gap={2}>
            <Text fontSize="sm">
              <Text
                as="span"
                fontWeight="medium"
              >
                {invoiceData.client.name}
              </Text>
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              {formatCNPJ(invoiceData.client.cnpj)}
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
              lineHeight="tall"
            >
              {invoiceData.client.address}
            </Text>
          </Stack>
        </Box>

        <Box mb={6}>
          <Text
            fontWeight="bold"
            mb={2}
          >
            Itens
          </Text>
          <CustomTable<{
            id: string
            period: string
            description: string
            value: number
            discount: number
            subtotal: number
          }>
            data={invoiceData.items}
            emptyStateMessage="Nenhum item encontrado"
            handleLimitChange={() => {}}
            handlePageChange={() => {}}
            header={
              <>
                <Table.ColumnHeader>Período</Table.ColumnHeader>
                <Table.ColumnHeader>Descrição</Table.ColumnHeader>
                <Table.ColumnHeader>Valor</Table.ColumnHeader>
                <Table.ColumnHeader>Descontos</Table.ColumnHeader>
                <Table.ColumnHeader>Subtotal</Table.ColumnHeader>
              </>
            }
            isLoading={false}
          >
            {invoiceData.items.map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell minW={200}>{item.period}</Table.Cell>
                <Table.Cell minW={200}>{item.description}</Table.Cell>
                <Table.Cell minW={200}>{formatCurrency(item.value)}</Table.Cell>
                <Table.Cell>{formatCurrency(item.discount)}</Table.Cell>
                <Table.Cell>{formatCurrency(item.subtotal)}</Table.Cell>
              </Table.Row>
            ))}
            <Table.Row>
              <Table.Cell
                colSpan={4}
                fontWeight="bold"
                textAlign="left"
              >
                Total
              </Table.Cell>
              <Table.Cell fontWeight="bold">
                {formatCurrency(invoiceData.total)}
              </Table.Cell>
            </Table.Row>
          </CustomTable>
        </Box>

        <Box mt={6}>
          <Text
            fontSize="lg"
            fontWeight="bold"
            mb={4}
          >
            Informações de Pagamento
          </Text>
          {isAlternativePayment &&
            data.invoiceNumber &&
            planAllowsAlternativePayments && (
            <Flex
              borderBottom="1px solid"
              borderColor="border.emphasized"
              gap={1}
              mb={4}
            >
              {allowPix && (
                <Button
                  borderBottom={activeTab === 'pix' ? '2px solid' : 'none'}
                  borderBottomColor={
                    activeTab === 'pix' ? 'colorPalette.solid' : 'transparent'
                  }
                  borderRadius="0"
                  colorPalette={activeTab === 'pix' ? 'blue' : 'gray'}
                  fontWeight="medium"
                  onClick={() => setActiveTab('pix')}
                  size="sm"
                  variant="ghost"
                >
                  Pix
                </Button>
              )}
              {allowBoleto && (
                <Button
                  borderBottom={activeTab === 'boleto' ? '2px solid' : 'none'}
                  borderBottomColor={
                    activeTab === 'boleto' ? 'colorPalette.solid' : 'transparent'
                  }
                  borderRadius="0"
                  colorPalette={activeTab === 'boleto' ? 'blue' : 'gray'}
                  fontWeight="medium"
                  onClick={() => setActiveTab('boleto')}
                  size="sm"
                  variant="ghost"
                >
                  Boleto
                </Button>
              )}
            </Flex>
          )}
          {renderTabContent()}
        </Box>
      </Box>
    </CustomDrawer>
  )
}

const InvoiceDetailsDrawer = memo(
  InvoiceDetailsDrawerComponent
) as typeof InvoiceDetailsDrawerComponent

export { InvoiceDetailsDrawer, type Props as InvoiceDetailsDrawerProps }
