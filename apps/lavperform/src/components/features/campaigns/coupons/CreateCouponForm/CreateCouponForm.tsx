import {
  Button,
  createListCollection,
  Field,
  Fieldset,
  Stack,
  Switch,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { RiAddLine, RiDeleteBinLine, RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, DeleteConfirmationDialog, Input, Select, Textarea, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { couponService } from '@/services'
import type { CreateCouponRequest } from '@/types'
import { toHtmlDateInputValue } from '@/utils/date'

import type { Props } from './CreateCouponForm.types'
import { editSchema, FormData, schema } from './schema'

const typeItems = createListCollection({
  items: [
    { value: 'desconto', label: 'Desconto' },
    { value: 'frete', label: 'Frete grátis (raio)' },
  ],
  itemToString: (i) => i.label,
  itemToValue: (i) => i.value,
})

const unitDiscountItems = createListCollection({
  items: [
    { value: 'reais', label: 'Reais (R$)' },
    { value: 'porcentagem', label: 'Porcentagem (%)' },
  ],
  itemToString: (i) => i.label,
  itemToValue: (i) => i.value,
})

const unitShippingItems = createListCollection({
  items: [{ value: 'km', label: 'Quilómetros' }],
  itemToString: (i) => i.label,
  itemToValue: (i) => i.value,
})

function toDateInputMin(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildPayload(values: FormData): CreateCouponRequest {
  return {
    code: values.code.trim().toUpperCase(),
    description: values.description.trim(),
    type: values.type,
    unit: values.unit,
    value: values.value,
    validUntil: `${values.validUntil}T23:59:59.999Z`,
    active: values.active,
  }
}

function CreateCouponFormBase({ onClose = () => undefined, coupon, open, onOpenChange }: Props) {
  const isEditMode = !!coupon
  const queryClient = useQueryClient()
  const { selectedCompany } = useAuth()
  const [isOpen, setIsOpen] = useState(open ?? false)

  useEffect(() => {
    if (open !== undefined) setIsOpen(open)
  }, [open])

  const activeSchema = isEditMode ? editSchema : schema
  const minDate = useMemo(() => toDateInputMin(), [])

  const { control, handleSubmit, formState, reset, watch, setValue } = useForm<
    FormData,
    unknown
  >({
    mode: 'onChange',
    resolver: yupResolver<FormData, unknown, FormData>(activeSchema) as any,
    defaultValues: isEditMode
      ? {
          code: coupon.code ?? '',
          description: coupon.description ?? '',
          type: coupon.type ?? 'desconto',
          unit: coupon.unit ?? 'reais',
          value: coupon.value ?? undefined,
          validUntil: toHtmlDateInputValue(coupon.validUntil),
          active: coupon.active ?? true,
        }
      : {
          code: '',
          description: '',
          type: 'desconto',
          unit: 'reais',
          value: undefined,
          validUntil: '',
          active: true,
        },
  })
  const { isSubmitting } = formState

  const type = watch('type')
  const unit = watch('unit')

  useEffect(() => {
    if (type === 'frete' && unit !== 'km') {
      setValue('unit', 'km', { shouldValidate: true, shouldDirty: true })
    }
    if (type === 'desconto' && unit !== 'reais' && unit !== 'porcentagem') {
      setValue('unit', 'reais', { shouldValidate: true, shouldDirty: true })
    }
  }, [setValue, type, unit])

  const unitCollection = useMemo(
    () => (type === 'frete' ? unitShippingItems : unitDiscountItems),
    [type]
  )

  const valueStep = useMemo(() => {
    if (unit === 'porcentagem') return 0.1
    if (unit === 'reais') return 0.01
    return 1
  }, [unit])

  const handleClose = () => {
    setTimeout(() => {
      onClose()
      reset()
      setIsOpen(false)
      onOpenChange?.(false)
    }, 300)
  }

  const handleDelete = async () => {
    if (!selectedCompany || !coupon) return
    try {
      await couponService.deleteCoupon(selectedCompany.id, coupon.id)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.companyCoupons(selectedCompany.id),
      })
      toaster.create({
        title: 'Cupom excluído',
        description: 'O cupom foi removido com sucesso.',
        type: 'success',
        closable: true,
        duration: 2000,
      })
      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível excluir o cupom.'

      toaster.dismiss()
      toaster.create({
        title: 'Erro ao excluir cupom',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  const handleSave = async (values: FormData) => {
    if (!selectedCompany) return
    try {
      if (isEditMode) {
        await couponService.updateCoupon(
          selectedCompany.id,
          coupon.id,
          buildPayload(values)
        )
      } else {
        await couponService.createCoupon(
          selectedCompany.id,
          buildPayload(values)
        )
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.companyCoupons(selectedCompany.id),
      })
      toaster.create({
        title: 'Sucesso',
        description: isEditMode ? 'Cupom atualizado com sucesso.' : 'Cupom criado com sucesso.',
        type: 'success',
        closable: true,
        duration: 2000,
      })
      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        (isEditMode ? 'Não foi possível atualizar o cupom.' : 'Não foi possível criar o cupom.')

      toaster.dismiss()
      toaster.create({
        title: isEditMode ? 'Editar cupom' : 'Novo cupom',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  const formId = isEditMode ? `edit-coupon-form-${coupon.id}` : 'create-coupon-form'

  return (
    <CustomDrawer
      closeTrigger
      footer={
        <Stack
          direction="row"
          justify="space-between"
          w="full"
        >
          {isEditMode && coupon && (
            <DeleteConfirmationDialog
              description="O cupom será removido permanentemente. Esta ação não pode ser desfeita."
              onClick={handleDelete}
              title="Excluir cupom?"
              trigger={
                <Button
                  colorPalette="red"
                  variant="subtle"
                >
                  <RiDeleteBinLine />
                  Excluir
                </Button>
              }
            />
          )}
          <Button
            form={formId}
            loading={isSubmitting}
            loadingText={isEditMode ? 'Salvando...' : 'Criando cupom...'}
            ms={isEditMode ? 'auto' : undefined}
            type="submit"
          >
            <RiSaveLine />
            {isEditMode ? 'Salvar cupom' : 'Criar cupom'}
          </Button>
        </Stack>
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      onOpenChange={(e) => {
        setIsOpen(e.open)
        onOpenChange?.(e.open)
      }}
      size="md"
      title={isEditMode ? 'Editar cupom' : 'Novo cupom'}
      trigger={
        isEditMode ? undefined : (
          <Button
            onClick={() => setIsOpen(true)}
            w={{ base: 'full', md: 'auto' }}
          >
            <RiAddLine />
            Novo cupom
          </Button>
        )
      }
    >
      <Stack
        as="form"
        gap={6}
        id={formId}
        onSubmit={handleSubmit(handleSave)}
      >
        <Fieldset.Root>
          <Fieldset.Content>
            <Input
              control={control}
              label="Código do cupom"
              name="code"
              placeholder="Ex.: PIZZA10"
              required
            />
            <Textarea
              control={control}
              label="Descrição"
              name="description"
              placeholder="Regra de uso, público, etc."
              required
              resize="vertical"
              rows={3}
            />
            <Select
              collection={typeItems}
              control={control}
              label="Tipo de benefício"
              name="type"
              placeholder="Selecione o tipo"
              required
            />
            <Select
              collection={unitCollection}
              control={control}
              key={type}
              label="Unidade"
              name="unit"
              placeholder="Selecione a unidade"
              required
            />
            <Input
              control={control}
              label={
                unit === 'porcentagem'
                  ? 'Percentagem'
                  : unit === 'reais'
                    ? 'Valor (R$)'
                    : 'Raio (km)'
              }
              name="value"
              required
              step={valueStep}
              type="number"
            />
            <Input
              control={control}
              label="Válido até"
              min={isEditMode ? undefined : minDate}
              name="validUntil"
              required
              type="date"
            />
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Field.Root>
                  <Switch.Root
                    checked={!!field.value}
                    colorPalette="green"
                    name={field.name}
                    onCheckedChange={({ checked }) => field.onChange(!!checked)}
                  >
                    <Switch.HiddenInput onBlur={field.onBlur} />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label marginBottom={0}>Cupom ativo</Switch.Label>
                  </Switch.Root>
                </Field.Root>
              )}
            />
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}

const CreateCouponForm = memo(CreateCouponFormBase) as typeof CreateCouponFormBase

export { CreateCouponForm, type Props as CreateCouponFormProps }
