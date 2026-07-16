import {
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
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRefreshLine,
  RiSaveLine,
} from 'react-icons/ri'

import { CustomDialog, CustomDrawer, CustomTable, toaster } from '@/components'
import {
  useCreateCreditProduct,
  useCreditProducts,
  useDeleteCreditProduct,
  useRestoreCreditProduct,
  useToggleCreditProduct,
  useUpdateCreditProduct,
} from '@/hooks/queries'
import {
  CREDIT_PRODUCT_CODE_LABELS,
  CreditProductCode,
  type CreditProduct,
} from '@/types'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

import {
  formatCreditCents,
  formatDateTime,
  getErrorMessage,
  parseCurrencyToCents,
} from '../../utils'

interface ListProps {
  companyId: string
}

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

function ProductForm({
  formId,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  formId: string
  initialValue?: CreditProduct
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
          placeholder="Descreva quando este produto consome créditos"
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
        <Switch.Label>Produto ativo</Switch.Label>
        <Switch.Control />
      </Switch.Root>
    </Stack>
  )
}

export function CreateProductModal({ companyId }: ListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const createProduct = useCreateCreditProduct(companyId)

  const handleSubmit = async (values: FormState) => {
    try {
      const priceCents = parseCurrencyToCents(values.price)

      if (!values.code) {
        throw new Error('Selecione o código do produto.')
      }

      if (priceCents < 1) {
        throw new Error('Informe um valor maior que zero.')
      }

      await createProduct.mutateAsync({
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        priceCents,
        active: values.active,
      })

      toaster.create({
        title: 'Produto criado',
        description: 'Produto de crédito adicionado com sucesso.',
        type: 'success',
      })
      setIsOpen(false)
    } catch (error) {
      toaster.create({
        title: 'Erro ao criar produto',
        description: getErrorMessage(
          error,
          'Não foi possível criar o produto.'
        ),
        type: 'error',
      })
    }
  }

  return (
    <CustomDialog
      content={
        <Box p={6}>
          <ProductForm
            key={String(isOpen)}
            formId="create-credit-product-form"
            isSubmitting={createProduct.isPending}
            onSubmit={handleSubmit}
          />
        </Box>
      }
      footer={
        <Button
          form="create-credit-product-form"
          loading={createProduct.isPending}
          type="submit"
        >
          <RiSaveLine />
          Criar produto
        </Button>
      }
      isOpen={isOpen}
      onOpenChange={(event) => setIsOpen(event.open)}
      title="Novo produto de crédito"
      trigger={
        <Button w={{ base: 'full', md: 'auto' }}>
          <RiAddLine />
          Novo produto
        </Button>
      }
    />
  )
}

export function EditProductDrawer({
  companyId,
  product,
  onClose,
}: ListProps & {
  product: CreditProduct
  onClose: () => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const updateProduct = useUpdateCreditProduct(companyId, product.id)

  const handleSubmit = async (values: FormState) => {
    try {
      const priceCents = parseCurrencyToCents(values.price)

      if (!values.code) {
        throw new Error('Selecione o código do produto.')
      }

      if (priceCents < 1) {
        throw new Error('Informe um valor maior que zero.')
      }

      await updateProduct.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        priceCents,
        active: values.active,
      })

      toaster.create({
        title: 'Produto atualizado',
        description: 'As alterações foram salvas com sucesso.',
        type: 'success',
      })
      setIsOpen(false)
      onClose()
    } catch (error) {
      toaster.create({
        title: 'Erro ao atualizar produto',
        description: getErrorMessage(
          error,
          'Não foi possível atualizar o produto.'
        ),
        type: 'error',
      })
    }
  }

  return (
    <CustomDrawer
      footer={
        <Button
          form="edit-credit-product-form"
          loading={updateProduct.isPending}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onExitComplete={onClose}
      title={`Produto: ${product.name}`}
    >
      <ProductForm
        formId="edit-credit-product-form"
        initialValue={product}
        isSubmitting={updateProduct.isPending}
        onSubmit={handleSubmit}
      />
    </CustomDrawer>
  )
}

export function ProductList({ companyId }: ListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<CreditProduct | null>(
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

  const { data, isLoading } = useCreditProducts(companyId, queryParams)
  const products = data?.items ?? []
  const toggleProduct = useToggleCreditProduct(companyId)
  const deleteProduct = useDeleteCreditProduct(companyId)
  const restoreProduct = useRestoreCreditProduct(companyId)

  const handleAction = useCallback(
    async (
      event: React.MouseEvent,
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
        <CreateProductModal companyId={companyId} />
      </Flex>
      <CustomTable<CreditProduct>
        css={tableStickyStyles}
        data={products}
        emptyStateMessage="Nenhum produto de crédito encontrado"
        handleLimitChange={(limit) => setParams({ page: 1, limit })}
        handlePageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        header={
          <>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>Código</Table.ColumnHeader>
            <Table.ColumnHeader>Descrição</Table.ColumnHeader>
            <Table.ColumnHeader>Valor</Table.ColumnHeader>
            <Table.ColumnHeader>Criado em</Table.ColumnHeader>
            <Table.ColumnHeader>Ações</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
        meta={data?.meta}
      >
        {products.map((product) => (
          <Table.Row
            cursor="pointer"
            key={product.id}
            onClick={() => setSelectedProduct(product)}
          >
            <Table.Cell>
              <Badge colorPalette={product.active ? 'green' : 'gray'}>
                {product.active ? 'Ativo' : 'Inativo'}
              </Badge>
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
              {formatDateTime(product.createdAt)}
            </Table.Cell>
            <Table.Cell minW={180}>
              <HStack>
                <IconButton
                  aria-label="Editar produto"
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
                    <Button
                      onClick={(event) =>
                        handleAction(
                          event,
                          () => toggleProduct.mutateAsync(product.id),
                          product.active
                            ? 'Produto desativado'
                            : 'Produto ativado'
                        )
                      }
                      size="xs"
                      variant="surface"
                    >
                      {product.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <IconButton
                      aria-label="Remover produto"
                      colorPalette="red"
                      onClick={(event) =>
                        handleAction(
                          event,
                          () => deleteProduct.mutateAsync(product.id),
                          'Produto removido'
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
                    aria-label="Restaurar produto"
                    onClick={(event) =>
                      handleAction(
                        event,
                        () => restoreProduct.mutateAsync(product.id),
                        'Produto restaurado'
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
        <EditProductDrawer
          companyId={companyId}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}
    </>
  )
}
