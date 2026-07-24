import { yupResolver } from '@hookform/resolvers/yup'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SubmitErrorHandler, SubmitHandler, useForm } from 'react-hook-form'
import * as yup from 'yup'

import { useAuth } from '@/context/AuthContext'
import {
  companyService,
  subscriptionPaymentService as paymentService,
  subscriptionService,
} from '@/services'
import type { Company } from '@/types'
import { logger } from '@/utils/logger'

import { toaster } from '../components/ui/toaster'

export interface Subscription {
  internal: {
    id: string
    companyId: string
    subscriptionId: string
    planId: string
    createdAt: string
    updatedAt: string
    plan: {
      id: string
      name: string
      description: string
      price: string
      allowBoleto?: boolean
      allowPix?: boolean
      createdAt: string
      updatedAt: string
    }
  }
  asaas: {
    object: string
    id: string
    dateCreated: string
    customer: string
    paymentLink: string | null
    value: number
    nextDueDate: string
    cycle: string
    description: string
    billingType: string
    deleted: boolean
    status: 'ACTIVE' | 'PENDING' | 'ATRASADO' | 'CANCELADO' | string
    externalReference: string
    checkoutSession: any | null
    creditCard: {
      creditCardNumber: string
      creditCardBrand: string
    } | null
    endDate: string | null
    maxPayments: number
    sendPaymentByPostalService: boolean
    fine: {
      value: number
      type: string
    }
    interest: {
      value: number
      type: string
    }
    split: any | null
  }
}

export interface SubscriptionTableItem {
  id: string
  planName: string
  planDescription: string
  planPrice: string
  billingType: string
  nextDueDate: string
  status: string
  card: string
  dateCreated: string
  invoiceNumber?: string
}

const schema = yup.object().shape({
  creditCard: yup.object().shape({
    name: yup.string().required('O nome do titular é obrigatório.'),
    number: yup
      .string()
      .matches(/^\d{13,19}$/, 'Número do cartão inválido. Apenas números.')
      .required('O número do cartão é obrigatório.'),
    expiryMonth: yup
      .string()
      .matches(/^(0[1-9]|1[0-2])$/, 'Mês inválido (MM).')
      .required('Mês é obrigatório.'),
    expiryYear: yup
      .string()
      .length(2, 'O ano deve ter 2 dígitos (AA).')
      .required('Ano é obrigatório.'),
    ccv: yup
      .string()
      .matches(/^\d{3,4}$/, 'CCV inválido (3 ou 4 dígitos).')
      .required('CCV é obrigatório.'),
  }),
  creditCardHolderInfo: yup.object().shape({
    name_holder: yup
      .string()
      .required('O nome completo do titular é obrigatório.'),
    email: yup
      .string()
      .email('Email inválido.')
      .required('O email é obrigatório.'),
    cpfCnpj: yup.string().required('CPF/CNPJ é obrigatório.'),
    postalCode: yup
      .string()
      .matches(/^\d{5}-?\d{3}$/, 'CEP inválido. Formato: 00000-000')
      .required('CEP é obrigatório.'),
    addressNumber: yup.string().required('O número do endereço é obrigatório.'),
    phone: yup.string().required('O telefone é obrigatório.'),
  }),
})

type FormData = yup.InferType<typeof schema>

const statusMap: Record<string, string> = {
  ACTIVE: 'ATIVO',
  PENDING: 'PENDENTE',
  OVERDUE: 'ATRASADO',
  CANCELADO: 'CANCELADO',
  RECEIVED: 'PAGO',
  INACTIVE: 'INATIVO',
  WAITING_FOR_CONFIRMATION: 'AGUARDANDO',
  RECEIVED_IN_CASH: 'PAGO (PIX/BOLETO)',
  CONFIRMED: 'CONFIRMADO',
}

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green',
  RECEBIDO: 'green',
  CONFIRMED: 'red',
  PENDING: 'yellow',
  OVERDUE: 'orange',
  RECEIVED: 'green',
  CANCELADO: 'red',
  INACTIVE: 'gray',
  WAITING_FOR_CONFIRMATION: 'yellow',
  RECEIVED_IN_CASH: 'green',
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

const formatCurrency = (value: number | string | undefined) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (numValue === undefined || isNaN(numValue)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numValue)
}

const formatCpfCnpj = (value: string | undefined | null): string => {
  if (!value) return 'N/A'
  const cleanValue = value.replace(/\D/g, '')

  if (cleanValue.length === 14) {
    return cleanValue.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
  }

  if (cleanValue.length === 11) {
    return cleanValue.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  return cleanValue
}

function getAlternativePaymentLabel(
  allowBoleto: boolean,
  allowPix: boolean
): string {
  if (allowBoleto && allowPix) return 'Boleto/Pix'
  if (allowBoleto) return 'Boleto'
  if (allowPix) return 'Pix'
  return 'N/A'
}

export function useSettingsAccountLogic() {
  const { selectedCompany } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionTableItem[]>([])
  const [assas, setAssas] = useState<SubscriptionTableItem[]>([])
  const [selectedSubscriptionItem, setSelectedSubscriptionItem] =
    useState<SubscriptionTableItem | null>(null)
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    orderBy: 'createdAt',
    orderDirection: 'desc' as 'asc' | 'desc',
  })
  const [allowBoleto, setAllowBoleto] = useState(false)
  const [allowPix, setAllowPix] = useState(false)

  const fetchSubscription = useCallback(async () => {
    if (!selectedCompany?.id) return
    setIsLoading(true)
    try {
      const { data } = await subscriptionService.listSubscriptions(
        selectedCompany.id
      )

      const planAllowsBoleto = data.internal.plan.allowBoleto ?? false
      const planAllowsPix = data.internal.plan.allowPix ?? false
      setAllowBoleto(planAllowsBoleto)
      setAllowPix(planAllowsPix)

      const subscriptionData: SubscriptionTableItem[] = [
        {
          id: data.internal.id,
          planName: data.internal.plan.name,
          planDescription: data.internal.plan.description,
          planPrice: data.internal.plan.price,
          billingType: data.asaas.billingType,
          nextDueDate: data.asaas.nextDueDate,
          dateCreated: data.asaas.dateCreated,
          status: data.asaas.status,
          card: data.asaas.creditCard
            ? `${
                data.asaas.creditCard.creditCardBrand
              } •••• ${data.asaas.creditCard.creditCardNumber.slice(-4)}`
            : 'N/A',
        },
      ]
      setSubscription(subscriptionData)
    } catch (error) {
      logger.error('Erro ao buscar assinatura:', error)
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível carregar a assinatura.',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany])

  const fetchPayments = useCallback(async () => {
    if (!selectedCompany?.id) return
    setIsLoading(true)
    try {
      const { data } = await paymentService.listSubscriptionPayments(
        selectedCompany.id
      )

      const planAllowsAlternativePayments = allowBoleto || allowPix
      const alternativeLabel = getAlternativePaymentLabel(allowBoleto, allowPix)

      const paymentsTableData: SubscriptionTableItem[] = data.data.map(
        (payment) => ({
          id: payment.id,
          invoiceNumber: payment.invoiceNumber || ' ',
          planName: payment.description,
          planDescription: payment.description,
          planPrice: payment.value.toString(),
          billingType: payment.billingType,
          nextDueDate: payment.dueDate,
          dateCreated: payment.dateCreated,
          status: payment.status,
          card: payment.creditCard
            ? `${
                payment.creditCard.creditCardBrand
              } •••• ${payment.creditCard.creditCardNumber.slice(-4)}`
            : payment.bankSlipUrl && planAllowsAlternativePayments
            ? alternativeLabel
            : 'N/A',
        })
      )
      setAssas(paymentsTableData)
    } catch (error) {
      logger.error('Erro ao buscar pagamentos (faturas):', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, allowBoleto, allowPix])

  const fetchCompany = useCallback(async () => {
    if (!selectedCompany?.id) return
    try {
      const { data } = await companyService.getCompany(selectedCompany.id)
      setCompany(data)
    } catch (error) {
      logger.error('Erro ao carregar empresa:', error)
    }
  }, [selectedCompany])

  const { register, control, handleSubmit } = useForm<FormData>({
    mode: 'onChange',
    resolver: yupResolver<FormData, any, any>(schema),
    defaultValues: {},
  })

  const handleValidationErrors: SubmitErrorHandler<FormData> = useCallback(
    (errors) => {
      logger.error('ERRO DE VALIDAÇÃO (Campos Incorretos):', errors)
      toaster.create({
        title: 'Erro no Formulário',
        description: 'Por favor, corrija os campos marcados e tente novamente.',
        type: 'error',
        closable: true,
        duration: 4000,
      })
    },
    []
  )

  const handleSave: SubmitHandler<FormData> = useCallback(
    async (values) => {
      const subscriptionItem = subscription[0]

      if (!selectedCompany || !subscriptionItem) {
        toaster.create({
          title: 'Erro',
          description: 'Não foi possível identificar a empresa ou assinatura.',
          type: 'error',
        })
        return
      }

      setIsLoading(true)

      const payload = {
        creditCard: {
          name: values.creditCard.name,
          number: values.creditCard.number.replace(/\s/g, ''),
          expiryMonth: values.creditCard.expiryMonth,
          expiryYear: `20${values.creditCard.expiryYear}`,
          ccv: values.creditCard.ccv,
        },
        creditCardHolderInfo: {
          name: values.creditCardHolderInfo.name_holder,
          email: values.creditCardHolderInfo.email,
          cpfCnpj: values.creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
          postalCode: values.creditCardHolderInfo.postalCode.replace(/\D/g, ''),
          addressNumber: values.creditCardHolderInfo.addressNumber,
          phone: values.creditCardHolderInfo.phone.replace(/\D/g, ''),
        },
      }

      try {
        await paymentService.addCreditCard(selectedCompany.id, payload)

        toaster.create({
          title: 'Sucesso',
          description: 'Cartão de crédito adicionado com sucesso.',
          type: 'success',
        })

        await fetchSubscription() // Atualiza os dados da assinatura
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string } }
          message?: string
        }

        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Não foi possível adicionar o cartão.'

        toaster.create({
          title: 'Erro ao salvar',
          description: errorMessage,
          type: 'error',
          closable: true,
          duration: 4000,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCompany, subscription, setIsLoading, fetchSubscription]
  )

  // --- Handlers de Paginação e Efeitos ---

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }))
  }, [])

  const handleLimitChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }))
  }, [])
  useEffect(() => {
    fetchCompany()
    fetchSubscription()
  }, [selectedCompany?.id, fetchCompany, fetchSubscription])

  useEffect(() => {
    fetchPayments()
  }, [
    selectedCompany?.id,
    params.page,
    params.limit,
    allowBoleto,
    allowPix,
    fetchPayments,
  ])

  // --- Memoized Values and Functions ---

  // Memoize formatting functions
  const memoizedFormatDate = useCallback(formatDate, [])
  const memoizedFormatCurrency = useCallback(formatCurrency, [])
  const memoizedFormatCpfCnpj = useCallback(formatCpfCnpj, [])

  const memoizedFormatters = useMemo(
    () => ({
      formatDate: memoizedFormatDate,
      formatCurrency: memoizedFormatCurrency,
      formatCpfCnpj: memoizedFormatCpfCnpj,
    }),
    [memoizedFormatDate, memoizedFormatCurrency, memoizedFormatCpfCnpj]
  )

  // Memoize derived values
  const derivedValues = useMemo(() => {
    const latestInvoice = assas?.[0]
    const planAllowsAlternativePayments = allowBoleto || allowPix
    const alternativePaymentLabel = getAlternativePaymentLabel(
      allowBoleto,
      allowPix
    )
    const isLastInvoiceBoletoOrPix =
      planAllowsAlternativePayments &&
      latestInvoice?.card === alternativePaymentLabel
    const subscriptionCard = subscription[0]?.card
    const hasCard = subscriptionCard && subscriptionCard !== 'N/A'

    return {
      latestInvoice,
      isLastInvoiceBoletoOrPix,
      subscriptionCard,
      hasCard,
      allowBoleto,
      allowPix,
      planAllowsAlternativePayments,
      alternativePaymentLabel,
    }
  }, [assas, subscription, allowBoleto, allowPix])

  // Memoize handlers
  const handlers = useMemo(
    () => ({
      handleLimitChange,
      handlePageChange,
      handleSave,
      handleValidationErrors,
    }),
    [handleLimitChange, handlePageChange, handleSave, handleValidationErrors]
  )

  // Memoize form state
  const formState = useMemo(
    () => ({
      register,
      control,
      handleSubmit,
    }),
    [register, control, handleSubmit]
  )

  // Memoize constants
  const constants = useMemo(
    () => ({
      statusMap,
      statusColorMap,
    }),
    []
  )

  return {
    // State
    company,
    subscription,
    assas,
    selectedSubscriptionItem,
    setSelectedSubscriptionItem,
    isLoading,
    params,

    // Derived values
    ...derivedValues,

    // Handlers
    ...handlers,

    // Form state
    ...formState,

    // Constants
    ...constants,

    // Formatters
    ...memoizedFormatters,
  }
}
