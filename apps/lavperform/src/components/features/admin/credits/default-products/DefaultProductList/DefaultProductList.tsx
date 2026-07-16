import {
  Alert,
  Badge,
  Box,
  Button,
  createListCollection,
  Field,
  Flex,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
} from '@chakra-ui/react'
import {
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRefreshLine,
  RiSaveLine,
} from 'react-icons/ri'

import { CustomDialog, CustomDrawer, CustomTable, toaster } from '@/components'
import {
  useCreateDefaultProduct,
  useDefaultProducts,
  useDeleteDefaultProduct,
  useRestoreDefaultProduct,
  useToggleDefaultProduct,
  useUpdateDefaultProduct,
} from '@/hooks/queries'
import {
  CREDIT_PRODUCT_CODE_LABELS,
  CreditProductCode,
  type DefaultProduct,
} from '@/types'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

import {
  formatCreditCents,
  getErrorMessage,
  parseCurrencyToCents,
} from '../../utils'

interface FormState {
  name: string
  code: CreditProductCode | ''
  description: string
  price: string
  active: boolean
}

const activeFilterCollection = createListCollection({
  items: [
    { label: 'Todos', value: 'all' },
    { label: 'Ativos', value: 'active' },
    { label: 'Inativos', value: 'inactive' },
  ],
})

const productCodeCollection = createListCollection({
  items: (Object.values(CreditProductCode) as CreditProductCode[]).map(
    (value) => ({
      label: CREDIT_PRODUCT_CODE_LABELS[value],
      value,
    })
  ),
})

const initialFormState: FormState = {
  name: '',
  code: '',
  description: '',
  price: '',
  active: true,
}

function DefaultProductForm({
  formId,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  formId: string
  initialValue?: DefaultProduct
  isSubmitting?: boolean
  onSubmit: (values: FormState) => Promise<void>
}) {
  const [values, setValues] = useState<FormState>(() =>
    initialValue
      ? {
          name: initialValue.name,
          code: initialValue.code,
          description: initialValue.description ?? '',
          price: (initialValue.priceCents / 100).toFixed(2).replace('.', ','),
          active: initialValue.active,
        }
      : initialFormState
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={formId}
      onSubmit={handleSubmit}
    >
      <Field.Root required>
        <Field.Label>
          Nome
          <Field.RequiredIndicator />
        </Field.Label>
        <Input
          disabled={isSubmitting}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, name: event.target.value }))
          }
          placeholder="Ex: Envio WhatsApp"
          required
          value={values.name}
        />
      </Field.Root>
      <Field.Root required>
        <Field.Label>
          Código
          <Field.RequiredIndicator />
        </Field.Label>
        <Select.Root
          collection={productCodeCollection}
          disabled={isSubmitting || !!initialValue}
          onValueChange={({ value }) =>
            setValues((prev) => ({
              ...prev,
              code: (value[0] as CreditProductCode | undefined) ?? '',
            }))
          }
          value={values.code ? [values.code] : []}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Selecione o código" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {productCodeCollection.items.map((item) => (
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
      </Field.Root>
      <Field.Root>
        <Field.Label>Descrição</Field.Label>
        <Textarea
          disabled={isSubmitting}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
          placeholder="Descreva quando esta oferta consome créditos"
          value={values.description}
        />
      </Field.Root>
      <Field.Root required>
        <Field.Label>
          Valor
          <Field.RequiredIndicator />
        </Field.Label>
        <Input
          disabled={isSubmitting}
          inputMode="decimal"
          onChange={(event) =>
            setValues((prev) => ({ ...prev, price: event.target.value }))
          }
          placeholder="0,25"
          required
          value={values.price}
        />
      </Field.Root>
      <Switch.Root
        checked={values.active}
        disabled={isSubmitting}
        onCheckedChange={(event) =>
          setValues((prev) => ({ ...prev, active: event.checked }))
        }
      >
        <Switch.Label>Oferta ativa</Switch.Label>
        <Switch.Control />
      </Switch.Root>
    </Stack>
  )
}

export function CreateDefaultProductModal() {
  const [isOpen, setIsOpen] = useState(false)
  const createProduct = useCreateDefaultProduct()

  const handleSubmit = async (values: FormState) => {
    try {
      const priceCents = parseCurrencyToCents(values.price)
      const name = values.name.trim()
      const description = values.description.trim()

      if (!name || !values.code) {
        throw new Error('Informe nome e código.')
      }

      if (priceCents < 1) {
        throw new Error('Informe um valor maior que zero.')
      }

      await createProduct.mutateAsync({
        name,
        code: values.code,
        description: description || undefined,
        priceCents,
        active: values.active,
      })

      toaster.create({
        title: 'Oferta default criada',
        description: 'Produto default adicionado com sucesso.',
        type: 'success',
      })
      setIsOpen(false)
    } catch (error) {
      toaster.create({
        title: 'Erro ao criar oferta default',
        description: getErrorMessage(error, 'Não foi possível criar a oferta.'),
        type: 'error',
      })
    }
  }

  return (
    <CustomDialog
      content={
        <Box p={6}>
          <DefaultProductForm
            key={String(isOpen)}
            formId="create-default-product-form"
            isSubmitting={createProduct.isPending}
            onSubmit={handleSubmit}
          />
        </Box>
      }
      footer={
        <Button
          form="create-default-product-form"
          loading={createProduct.isPending}
          type="submit"
        >
          <RiSaveLine />
          Criar oferta
        </Button>
      }
      isOpen={isOpen}
      onOpenChange={(event) => setIsOpen(event.open)}
      title="Nova oferta default"
      trigger={
        <Button w={{ base: 'full', md: 'auto' }}>
          <RiAddLine />
          Nova oferta
        </Button>
      }
    />
  )
}

export function EditDefaultProductDrawer({
  product,
  onClose,
}: {
  product: DefaultProduct
  onClose: () => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const updateProduct = useUpdateDefaultProduct(product.id)

  const handleSubmit = async (values: FormState) => {
    try {
      const priceCents = parseCurrencyToCents(values.price)
      const name = values.name.trim()
      const description = values.description.trim()

      if (!values.code) {
        throw new Error('Selecione o código do produto.')
      }

      if (!name) {
        throw new Error('Informe o nome.')
      }

      if (priceCents < 1) {
        throw new Error('Informe um valor maior que zero.')
      }

      await updateProduct.mutateAsync({
        name,
        description: description || undefined,
        priceCents,
        active: values.active,
      })

      toaster.create({
        title: 'Oferta default atualizada',
        description: 'As alterações foram salvas com sucesso.',
        type: 'success',
      })
      setIsOpen(false)
      onClose()
    } catch (error) {
      toaster.create({
        title: 'Erro ao atualizar oferta default',
        description: getErrorMessage(
          error,
          'Não foi possível atualizar a oferta.'
        ),
        type: 'error',
      })
    }
  }

  return (
    <CustomDrawer
      footer={
        <Button
          form="edit-default-product-form"
          loading={updateProduct.isPending}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={onClose}
      title={`Oferta: ${product.name}`}
    >
      <DefaultProductForm
        formId="edit-default-product-form"
        initialValue={product}
        isSubmitting={updateProduct.isPending}
        onSubmit={handleSubmit}
      />
    </CustomDrawer>
  )
}

export function DefaultProductList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<DefaultProduct | null>(
    null
  )
  const [params, setParams] = useState({ page: 1, limit: 20 })

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearchQuery, activeFilter, includeDeleted])

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      ...(activeFilter !== 'all' && { active: activeFilter === 'active' }),
      ...(includeDeleted && { includeDeleted: true }),
    }),
    [activeFilter, debouncedSearchQuery, includeDeleted, params]
  )

  const { data, isLoading, isError, error, refetch } =
    useDefaultProducts(queryParams)
  const products = data ?? []
  const toggleProduct = useToggleDefaultProduct()
  const deleteProduct = useDeleteDefaultProduct()
  const restoreProduct = useRestoreDefaultProduct()

  const handleAction = useCallback(
    async (
      event: MouseEvent,
      action: () => Promise<unknown>,
      successTitle: string
    ) => {
      event.stopPropagation()
      try {
        await action()
        toaster.create({ title: successTitle, type: 'success' })
      } catch (error) {
        toaster.create({
          title: 'Erro na operação',
          description: getErrorMessage(error, 'Tente novamente em instantes.'),
          type: 'error',
        })
      }
    },
    []
  )

  if (isError) {
    return (
      <Alert.Root
        status="error"
        variant="surface"
      >
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Erro ao carregar ofertas default</Alert.Title>
          <Alert.Description>
            {getErrorMessage(error, 'Não foi possível carregar as ofertas.')}
          </Alert.Description>
        </Alert.Content>
        <Button
          ml="auto"
          onClick={() => refetch()}
          size="sm"
          variant="surface"
        >
          Tentar novamente
        </Button>
      </Alert.Root>
    )
  }

  return (
    <>
      <Flex
        alignItems="center"
        direction={{ base: 'column', lg: 'row' }}
        gap={2}
        mb={4}
      >
        <Input
          bg="bg"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nome, código ou descrição..."
          value={searchQuery}
        />
        <Box minW={{ base: 'full', lg: '180px' }}>
          <Select.Root
            collection={activeFilterCollection}
            onValueChange={({ value }) => setActiveFilter(value[0] ?? 'all')}
            value={[activeFilter]}
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
                {activeFilterCollection.items.map((item) => (
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
        <Button
          onClick={() => setIncludeDeleted((prev) => !prev)}
          variant={includeDeleted ? 'solid' : 'surface'}
          w={{ base: 'full', lg: 'auto' }}
        >
          Removidos
        </Button>
        <CreateDefaultProductModal />
      </Flex>
      <CustomTable<DefaultProduct>
        css={tableStickyStyles}
        data={products}
        emptyStateMessage="Nenhuma oferta default encontrada"
        handleLimitChange={(limit) => setParams({ page: 1, limit })}
        handlePageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        header={
          <>
            <Table.ColumnHeader>Ativo</Table.ColumnHeader>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>Código</Table.ColumnHeader>
            <Table.ColumnHeader>Descrição</Table.ColumnHeader>
            <Table.ColumnHeader>Valor</Table.ColumnHeader>
            <Table.ColumnHeader>Ações</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
      >
        {products.map((product) => (
          <Table.Row
            cursor="pointer"
            key={product.id}
            onClick={() => setSelectedProduct(product)}
          >
            <Table.Cell>
              <Switch.Root
                checked={product.active}
                disabled={!!product.deletedAt}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={async () => {
                  try {
                    await toggleProduct.mutateAsync(product.id)
                    toaster.create({
                      title: product.active
                        ? 'Oferta desativada'
                        : 'Oferta ativada',
                      type: 'success',
                    })
                  } catch (err) {
                    toaster.create({
                      title: 'Erro ao alterar status',
                      description: getErrorMessage(
                        err,
                        'Tente novamente em instantes.'
                      ),
                      type: 'error',
                    })
                  }
                }}
                size="sm"
              >
                <Switch.Control />
              </Switch.Root>
            </Table.Cell>
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{product.name}</Text>
            </Table.Cell>
            <Table.Cell minW={180}>
              <Text
                fontFamily="mono"
                lineClamp={1}
              >
                {product.code}
              </Text>
            </Table.Cell>
            <Table.Cell minW={240}>
              <Text lineClamp={1}>{product.description || '-'}</Text>
            </Table.Cell>
            <Table.Cell minW={120}>
              {formatCreditCents(product.priceCents)}
            </Table.Cell>
            <Table.Cell minW={160}>
              <HStack>
                <IconButton
                  aria-label="Editar oferta default"
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedProduct(product)
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <RiEditLine />
                </IconButton>
                {!product.deletedAt ? (
                  <>
                    <IconButton
                      aria-label="Remover oferta default"
                      colorPalette="red"
                      onClick={(event) =>
                        handleAction(
                          event,
                          () => deleteProduct.mutateAsync(product.id),
                          'Oferta removida'
                        )
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <RiDeleteBinLine />
                    </IconButton>
                  </>
                ) : (
                  <IconButton
                    aria-label="Restaurar oferta default"
                    onClick={(event) =>
                      handleAction(
                        event,
                        () => restoreProduct.mutateAsync(product.id),
                        'Oferta restaurada'
                      )
                    }
                    size="sm"
                    variant="ghost"
                  >
                    <RiRefreshLine />
                  </IconButton>
                )}
              </HStack>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
      {selectedProduct && (
        <EditDefaultProductDrawer
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}
    </>
  )
}
