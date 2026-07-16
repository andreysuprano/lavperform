import {
  Badge,
  Box,
  Button,
  Code,
  createListCollection,
  Field,
  Flex,
  HStack,
  Image,
  Input,
  Link,
  Portal,
  Select,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import { CustomDialog, CustomTable, toaster } from '@/components'
import {
  useCreateCreditTopup,
  useCreditTopups,
  useUpdateCreditTopupStatus,
} from '@/hooks/queries'
import type {
  AsaasPaymentData,
  CreditPaymentMethod,
  CreditTopup,
  CreditTopupStatus,
} from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

import {
  formatCreditCents,
  formatDateTime,
  getErrorMessage,
  parseCurrencyToCents,
} from '../../utils'

interface Props {
  companyId: string
  readOnly?: boolean
}

const paymentMethodCollection = createListCollection({
  items: [
    { label: 'PIX', value: 'PIX' },
    { label: 'Cartão de crédito', value: 'CREDIT_CARD' },
    { label: 'Cartão de débito', value: 'DEBIT_CARD' },
  ],
})

const paymentMethodFilterCollection = createListCollection({
  items: [
    { label: 'Todos', value: 'all' },
    ...paymentMethodCollection.items,
  ],
})

const statusCollection = createListCollection({
  items: [
    { label: 'Pendente', value: 'PENDING' },
    { label: 'Pago', value: 'PAID' },
    { label: 'Falhou', value: 'FAILED' },
    { label: 'Cancelado', value: 'CANCELED' },
    { label: 'Expirado', value: 'EXPIRED' },
  ],
})

const statusFilterCollection = createListCollection({
  items: [{ label: 'Todos', value: 'all' }, ...statusCollection.items],
})

const statusColor: Record<CreditTopupStatus, string> = {
  PENDING: 'yellow',
  PAID: 'green',
  FAILED: 'red',
  CANCELED: 'gray',
  EXPIRED: 'orange',
}

export function TopupStatusBadge({ status }: { status: CreditTopupStatus }) {
  const label = statusCollection.items.find((item) => item.value === status)

  return (
    <Badge colorPalette={statusColor[status]}>
      {label?.label ?? status}
    </Badge>
  )
}

function PixPaymentInfo({ payment }: { payment?: AsaasPaymentData }) {
  if (!payment) return null

  const qrCode = payment.pixQrCode ?? payment.encodedImage
  const copyPaste = payment.pixCopyPaste ?? payment.payload
  const paymentUrl = payment.invoiceUrl ?? payment.bankSlipUrl

  if (!qrCode && !copyPaste && !paymentUrl) return null

  return (
    <Stack
      bg="bg.muted"
      borderRadius="md"
      borderWidth="1px"
      gap={3}
      mt={4}
      p={4}
    >
      <Text fontWeight="semibold">Dados de pagamento</Text>
      {qrCode && (
        <Image
          alt="QR Code PIX"
          boxSize="180px"
          src={
            String(qrCode).startsWith('data:')
              ? String(qrCode)
              : `data:image/png;base64,${qrCode}`
          }
        />
      )}
      {copyPaste && (
        <Box>
          <Text
            color="fg.muted"
            fontSize="sm"
            mb={1}
          >
            PIX copia e cola
          </Text>
          <Code
            display="block"
            maxW="full"
            overflow="auto"
            p={2}
            whiteSpace="pre-wrap"
          >
            {String(copyPaste)}
          </Code>
          <Button
            mt={2}
            onClick={async () => {
              const success = await copyToClipboard(String(copyPaste))
              toaster.create({
                title: success ? 'Código copiado' : 'Não foi possível copiar',
                type: success ? 'success' : 'error',
              })
            }}
            size="sm"
            variant="surface"
          >
            Copiar código
          </Button>
        </Box>
      )}
      {paymentUrl && (
        <Link
          href={String(paymentUrl)}
          target="_blank"
        >
          Abrir cobrança
        </Link>
      )}
    </Stack>
  )
}

export function CreateTopupModal({ companyId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] =
    useState<CreditPaymentMethod>('PIX')
  const [createdTopup, setCreatedTopup] = useState<CreditTopup | null>(null)
  const createTopup = useCreateCreditTopup(companyId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    try {
      const amountCents = parseCurrencyToCents(amount)

      if (amountCents < 1) {
        throw new Error('Informe um valor maior que zero.')
      }

      const topup = await createTopup.mutateAsync({
        amountCents,
        paymentMethod,
      })

      setCreatedTopup(topup)
      toaster.create({
        title: 'Recarga criada',
        description: 'A cobrança foi criada com status pendente.',
        type: 'success',
      })
    } catch (error) {
      toaster.create({
        title: 'Erro ao criar recarga',
        description: getErrorMessage(error, 'Não foi possível criar a recarga.'),
        type: 'error',
      })
    }
  }

  return (
    <CustomDialog
      content={
        <Box p={6}>
          <Stack
            as="form"
            gap={4}
            id="create-credit-topup-form"
            onSubmit={handleSubmit}
          >
            <Field.Root required>
              <Field.Label>
                Valor
                <Field.RequiredIndicator />
              </Field.Label>
              <Input
                disabled={createTopup.isPending}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100,00"
                value={amount}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Método de pagamento
                <Field.RequiredIndicator />
              </Field.Label>
              <Select.Root
                collection={paymentMethodCollection}
                disabled={createTopup.isPending}
                onValueChange={({ value }) =>
                  setPaymentMethod(value[0] as CreditPaymentMethod)
                }
                value={[paymentMethod]}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {paymentMethodCollection.items.map((item) => (
                        <Select.Item
                          item={item}
                          key={item.value}
                        >
                          {item.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Field.Root>
          </Stack>
          {createdTopup && (
            <Stack
              borderTopWidth="1px"
              gap={2}
              mt={5}
              pt={5}
            >
              <HStack justify="space-between">
                <Text fontWeight="semibold">Status inicial</Text>
                <TopupStatusBadge status={createdTopup.status} />
              </HStack>
              <Text fontSize="sm">
                Valor: {formatCreditCents(createdTopup.amountCents)}
              </Text>
              <PixPaymentInfo payment={createdTopup.asaasPayment} />
            </Stack>
          )}
        </Box>
      }
      footer={
        <Button
          form="create-credit-topup-form"
          loading={createTopup.isPending}
          type="submit"
        >
          <RiSaveLine />
          Criar recarga
        </Button>
      }
      isOpen={isOpen}
      onOpenChange={(event) => {
        setIsOpen(event.open)
        if (!event.open) {
          setAmount('')
          setPaymentMethod('PIX')
          setCreatedTopup(null)
        }
      }}
      title="Nova recarga"
      trigger={
        <Button w={{ base: 'full', md: 'auto' }}>
          <RiAddLine />
          Nova recarga
        </Button>
      }
    />
  )
}

export function UpdateTopupStatusModal({
  companyId,
  topup,
}: Props & { topup: CreditTopup }) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<CreditTopupStatus>(topup.status)
  const [paidAt, setPaidAt] = useState('')
  const updateStatus = useUpdateCreditTopupStatus(companyId, topup.id)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    try {
      await updateStatus.mutateAsync({
        status,
        ...(status === 'PAID' && paidAt && { paidAt: new Date(paidAt).toISOString() }),
      })

      toaster.create({
        title: 'Status atualizado',
        description: 'A recarga foi atualizada com sucesso.',
        type: 'success',
      })
      setIsOpen(false)
    } catch (error) {
      toaster.create({
        title: 'Erro ao atualizar status',
        description: getErrorMessage(error, 'Não foi possível atualizar a recarga.'),
        type: 'error',
      })
    }
  }

  return (
    <CustomDialog
      content={
        <Box p={6}>
          <Stack
            as="form"
            gap={4}
            id={`update-topup-status-${topup.id}`}
            onSubmit={handleSubmit}
          >
            <Field.Root required>
              <Field.Label>
                Status
                <Field.RequiredIndicator />
              </Field.Label>
              <Select.Root
                collection={statusCollection}
                disabled={updateStatus.isPending}
                onValueChange={({ value }) =>
                  setStatus(value[0] as CreditTopupStatus)
                }
                value={[status]}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {statusCollection.items.map((item) => (
                        <Select.Item
                          item={item}
                          key={item.value}
                        >
                          {item.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Field.Root>
            {status === 'PAID' && (
              <Field.Root>
                <Field.Label>Pago em</Field.Label>
                <Input
                  disabled={updateStatus.isPending}
                  onChange={(event) => setPaidAt(event.target.value)}
                  type="datetime-local"
                  value={paidAt}
                />
              </Field.Root>
            )}
          </Stack>
        </Box>
      }
      footer={
        <Button
          form={`update-topup-status-${topup.id}`}
          loading={updateStatus.isPending}
          type="submit"
        >
          <RiSaveLine />
          Atualizar
        </Button>
      }
      isOpen={isOpen}
      onOpenChange={(event) => setIsOpen(event.open)}
      title="Atualizar status da recarga"
      trigger={<Button size="xs">Alterar status</Button>}
    />
  )
}

export function TopupList({ companyId, readOnly = false }: Props) {
  const [status, setStatus] = useState('all')
  const [paymentMethod, setPaymentMethod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [params, setParams] = useState({ page: 1, limit: 20 })

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [status, paymentMethod, startDate, endDate])

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(status !== 'all' && { status: status as CreditTopupStatus }),
      ...(paymentMethod !== 'all' && {
        paymentMethod: paymentMethod as CreditPaymentMethod,
      }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }),
    [endDate, params, paymentMethod, startDate, status]
  )

  const { data, isLoading } = useCreditTopups(companyId, queryParams)
  const topups = data?.items ?? []

  return (
    <>
      <Flex
        alignItems="center"
        direction={{ base: 'column', xl: 'row' }}
        gap={2}
        mb={4}
      >
        <Box minW={{ base: 'full', xl: '180px' }}>
          <Select.Root
            collection={statusFilterCollection}
            onValueChange={({ value }) => setStatus(value[0] ?? 'all')}
            value={[status]}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {statusFilterCollection.items.map((item) => (
                  <Select.Item
                    item={item}
                    key={item.value}
                  >
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Box>
        <Box minW={{ base: 'full', xl: '220px' }}>
          <Select.Root
            collection={paymentMethodFilterCollection}
            onValueChange={({ value }) => setPaymentMethod(value[0] ?? 'all')}
            value={[paymentMethod]}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {paymentMethodFilterCollection.items.map((item) => (
                  <Select.Item
                    item={item}
                    key={item.value}
                  >
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Box>
        <Input
          bg="bg"
          onChange={(event) => setStartDate(event.target.value)}
          type="date"
          value={startDate}
        />
        <Input
          bg="bg"
          onChange={(event) => setEndDate(event.target.value)}
          type="date"
          value={endDate}
        />
        <CreateTopupModal companyId={companyId} />
      </Flex>
      <CustomTable<CreditTopup>
        css={tableStickyStyles}
        data={topups}
        emptyStateMessage="Nenhuma recarga encontrada"
        handleLimitChange={(limit) => setParams({ page: 1, limit })}
        handlePageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        header={
          <>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Valor</Table.ColumnHeader>
            <Table.ColumnHeader>Método</Table.ColumnHeader>
            {!readOnly && <Table.ColumnHeader>Cobrança Asaas</Table.ColumnHeader>}
            <Table.ColumnHeader>Criada em</Table.ColumnHeader>
            <Table.ColumnHeader>Pago em</Table.ColumnHeader>
            {!readOnly && <Table.ColumnHeader>Ações</Table.ColumnHeader>}
          </>
        }
        isLoading={isLoading}
        meta={data?.meta}
      >
        {topups.map((topup) => (
          <Table.Row key={topup.id}>
            <Table.Cell>
              <TopupStatusBadge status={topup.status} />
            </Table.Cell>
            <Table.Cell minW={120}>
              {formatCreditCents(topup.amountCents)}
            </Table.Cell>
            <Table.Cell minW={140}>{topup.paymentMethod}</Table.Cell>
            {!readOnly && (
              <Table.Cell minW={180}>
                <Text
                  fontFamily="mono"
                  lineClamp={1}
                >
                  {topup.asaasChargeId || '-'}
                </Text>
              </Table.Cell>
            )}
            <Table.Cell minW={160}>{formatDateTime(topup.createdAt)}</Table.Cell>
            <Table.Cell minW={160}>{formatDateTime(topup.paidAt)}</Table.Cell>
            {!readOnly && (
              <Table.Cell minW={140}>
                <UpdateTopupStatusModal
                  companyId={companyId}
                  topup={topup}
                />
              </Table.Cell>
            )}
          </Table.Row>
        ))}
      </CustomTable>
    </>
  )
}
