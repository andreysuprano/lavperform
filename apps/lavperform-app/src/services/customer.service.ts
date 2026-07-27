import type {
  CustomerBehavior,
  CustomerFormData,
  CustomerHistoryEvent,
  CustomerImport,
  CustomerMessageApiItem,
  CustomerMessageDetail,
  CustomerMessageResponse,
  CustomerMessages,
  CustomerMetricsResponse,
  CustomerOrderSummary,
  CustomerResponse,
  DashCustomersProps,
  TopBuyersResponse,
  OrderDirection,
  RfvMatrixData,
  WhatsAppContact,
  WhatsAppCustomer,
} from '@/types'
import { ClientTypes } from '@/utils/constants/clientType'
import { cleanNumber } from '@/utils/mask'

import { client } from './client'
import { whatsappService } from './whatsapp.service'

/**
 * Mapeia dados do endpoint customers/summary para estrutura RfvMatrixData
 * O endpoint retorna array de segmentos, precisamos converter para objeto
 * com chaves correspondentes aos segmentos RFV
 */
function mapSummaryToRfvMatrix(
  summary: Array<{
    segmentation: string
    count: number
    label: string
    icon: string
  }>
): RfvMatrixData {
  // Inicializa todos os segmentos com count: 0
  // O percentual será calculado dinamicamente no componente
  const rfvData: RfvMatrixData = {
    campeao: { count: 0, percentage: 0 },
    fiel: { count: 0, percentage: 0 },
    em_potencial: { count: 0, percentage: 0 },
    novo: { count: 0, percentage: 0 },
    promissor: { count: 0, percentage: 0 },
    precisa_de_atencao: { count: 0, percentage: 0 },
    quase_dormente: { count: 0, percentage: 0 },
    nao_posso_perder: { count: 0, percentage: 0 },
    em_risco: { count: 0, percentage: 0 },
    hibernando: { count: 0, percentage: 0 },
    perdido: { count: 0, percentage: 0 },
    lead: { count: 0, percentage: 0 },
  }

  // Preenche com dados do summary
  // O campo 'segmentation' corresponde às chaves do RfvMatrixData
  summary.forEach((item) => {
    const segmentationKey = item.segmentation as keyof RfvMatrixData
    if (segmentationKey && rfvData[segmentationKey] !== undefined) {
      rfvData[segmentationKey].count = item.count
    }
  })

  return rfvData
}

/**
 * Mapear status da API para status do componente
 */
function mapMessageStatus(apiStatus: CustomerMessageApiItem['status']): {
  status: CustomerMessageDetail['status']
  statusLabel: string
} {
  const statusMap: Record<
    CustomerMessageApiItem['status'],
    { status: CustomerMessageDetail['status']; statusLabel: string }
  > = {
    SENT: { status: 'sent', statusLabel: 'Enviada' },
    // PROCESSING: Mensagem está sendo processada pelo sistema antes do envio
    // (ex: aguardando horário agendado, validando dados, preparando envio)
    PROCESSING: { status: 'processing', statusLabel: 'Processando' },
    DELIVERED: { status: 'delivered', statusLabel: 'Entregue' },
    READ: { status: 'read', statusLabel: 'Lida' },
    FAILED: { status: 'failed', statusLabel: 'Falhou' },
    ERROR: { status: 'failed', statusLabel: 'Erro' },
    ABORTED: { status: 'failed', statusLabel: 'Cancelada' },
  }

  return statusMap[apiStatus] || { status: 'sent', statusLabel: 'Enviada' }
}

/**
 * Mapeia item da API para formato do componente, ou seja, o que será exibido no modal
 */
function mapMessageToDetail(
  apiMessage: CustomerMessageApiItem
): CustomerMessageDetail {
  const { status, statusLabel } = mapMessageStatus(apiMessage.status)

  return {
    id: apiMessage.id,
    content: apiMessage.messageText,
    platform: 'whatsapp', // Sempre WhatsApp conforme confirmado, mas poderá sofrer alterações futuramente
    platformName: 'WhatsApp',
    sentAt: apiMessage.createdAt,
    status,
    statusLabel,
    mediaUrl: apiMessage.mediaUrl,
    phone: apiMessage.phone,
  }
}

/**
 * Mapeia WhatsAppContact para WhatsAppCustomer
 * Usado para importação de contatos do WhatsApp
 */
function mapWhatsAppContactToCustomer(
  contact: WhatsAppContact
): WhatsAppCustomer {
  const phoneDigits = cleanNumber(contact.phone)
  const hasValidPhone = phoneDigits.length >= 10
  const whatsappOptin = true
  const whatsappVerified = true
  const isActive = whatsappOptin && hasValidPhone

  return {
    id: contact.phone, // Usar phone como ID único
    name: contact.name,
    phone: contact.phone,
    email: null,
    whatsappOptin,
    whatsappVerified,
    isActive,
  }
}

/**
 * Mapeia WhatsAppCustomer para CustomerImport
 * Usado para enviar ao endpoint de importação
 */
function mapWhatsAppCustomerToImport(
  customer: WhatsAppCustomer
): CustomerImport {
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    birthDate: null,
    firstOrderDate: null,
    rfvClassification: ClientTypes.Novo,
    gender: null,
    observations: null,
    whatsappOptin: customer.whatsappOptin,
    averageTicket: null,
    address: {
      street: null,
      number: null,
      complement: undefined,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
    },
  }
}

export const customerService = {
  async importCustomers(companyId: string, customers: CustomerImport[]) {
    return await client.post(
      `/companies/${companyId}/customers/import`,
      customers
    )
  },

  async listCustomers(
    companyId: string,
    params?: {
      page?: number
      limit?: number
      orderBy?: string
      orderDirection?: OrderDirection
      name?: string
      rfvClassification?: string[]
      hasEmail?: boolean
      hasBirthDate?: boolean
      whatsappOptin?: boolean
      whatsappVerified?: boolean
      hasOrders?: boolean
    }
  ) {
    // Backend espera rfvClassification como string JSON na query (ex: ["fiel"]).
    const requestParams = params?.rfvClassification?.length
      ? {
          ...params,
          rfvClassification: JSON.stringify(params.rfvClassification),
        }
      : params

    return await client.get<CustomerResponse>(
      `/companies/${companyId}/customers`,
      {
        params: requestParams,
      }
    )
  },

  async getTopBuyers(
    companyId: string,
    limit = 10,
    sortBy: 'totalSpent' | 'orderCount' = 'totalSpent',
    startDate?: string,
    endDate?: string
  ) {
    return await client.get<TopBuyersResponse>(
      `/companies/${companyId}/customers/top`,
      {
        params: {
          limit,
          sortBy,
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }
    )
  },

  async createCustomer(companyId: string, customer: CustomerFormData) {
    return await client.post(`/companies/${companyId}/customers`, customer)
  },

  async updateCustomer(
    companyId: string,
    customerId: string,
    customer: CustomerFormData
  ) {
    return await client.patch(
      `/companies/${companyId}/customers/${customerId}`,
      customer
    )
  },

  async deleteCustomer(companyId: string, customerId: string) {
    return await client.delete(
      `/companies/${companyId}/customers/${customerId}`
    )
  },

  async listCustomerOrders(customerId: string) {
    return await client.get(`/orders/customer/${customerId}`)
  },

  async listCustomersSummary(customerId: string) {
    return await client.get(`/companies/${customerId}/customers/summary`)
  },

  // ==================== CustomerDetailsModal Methods ====================

  /**
   * Busca as vendas resumidas do cliente para exibição
   */
  async getCustomerOrdersSummary(
    customerId: string
  ): Promise<{ data: CustomerOrderSummary[] }> {
    // Quando ocorrer algum error  retornar dados mockados
    return {
      data: [
        {
          id: '#9921',
          date: '14 Out 2023',
          description: 'PROMO DE NATAL, XTUDO, 3x X-Bacon',
          value: 89.9,
          coupon: 'NATAL20',
        },
        {
          id: '#8402',
          date: '02 Out 2023',
          description: 'XTUDO, 2x X-Bacon, Batata Frita',
          value: 55.0,
          coupon: 'FRETEGRATIS',
        },
        {
          id: '#7891',
          date: '28 Set 2023',
          description: 'PROMO DE NATAL, Pizza Grande',
          value: 120.5,
          coupon: '',
        },
      ],
    }
  },

  /**
   * Busca dados comportamentais do cliente (RFV e métricas)
   */
  async getCustomerBehavior(
    companyId: string,
    customerId: string
  ): Promise<{ data: CustomerBehavior }> {
    const response = await client.get<CustomerBehavior>(
      `/companies/${companyId}/customers/behavior/${customerId}`
    )
    return { data: response.data }
  },

  /**
   * Busca resumo de mensagens enviadas ao cliente
   */
  async getCustomerMessages(
    customerId: string
  ): Promise<{ data: CustomerMessages }> {
    // TODO: Implementar endpoint real quando disponível
    return {
      data: {
        total: 12,
        byWhatsApp: 12,
        lastMessage: 'há 2 meses',
      },
    }
  },

  /**
   * Busca o histórico detalhado de mensagens enviadas ao cliente
   * Mostra plataforma, data/hora e status de cada mensagem
   */
  async getCustomerMessageHistory(
    companyId: string,
    customerId: string,
    params?: {
      page?: number
      limit?: number
      orderDirection?: OrderDirection
    }
  ): Promise<{ data: CustomerMessageDetail[] }> {
    const response = await client.get<CustomerMessageResponse>(
      `/companies/${companyId}/customers/messages/${customerId}`,
      {
        params: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          orderDirection: params?.orderDirection || 'desc',
        },
      }
    )

    return {
      data: response.data.data.map((message) => mapMessageToDetail(message)),
    }
  },

  /**
   * Busca histórico/timeline do cliente
   */
  async getCustomerHistory(
    customerId: string
  ): Promise<{ data: CustomerHistoryEvent[] }> {
    // Implementar endpoint real quando disponível
    return {
      data: [
        {
          type: 'purchase',
          title: 'Compra realizada',
          value: 58.9,
          channel: 'WhatsApp',
          timeAgo: 'há 3 meses',
          iconType: 'bag',
        },
        {
          type: 'repurchase',
          title: 'Recompra realizada',
          value: 62.0,
          channel: 'App',
          timeAgo: 'há 2 meses',
          iconType: 'bag',
        },
        {
          type: 'coupon',
          title: 'Recebeu cupom',
          discount: '10% OFF',
          campaign: 'Campanha Fidelização',
          timeAgo: 'há 1 mês',
          iconType: 'coupon',
        },
        {
          type: 'purchase',
          title: 'Compra realizada',
          value: 89.9,
          channel: 'Loja',
          timeAgo: 'há 1 mês',
          iconType: 'bag',
        },
        {
          type: 'purchase',
          title: 'Compra realizada',
          value: 45.5,
          channel: 'WhatsApp',
          timeAgo: 'há 2 semanas',
          iconType: 'bag',
        },
      ],
    }
  },

  /**
   * Busca segmentos aos quais o cliente pertence
   */
  // async getCustomerSegments(
  //   customerId: string
  // ): Promise<{ data: CustomerSegment[] }> {
  //   return {
  //     data: [
  //       {
  //         segment: 'Fiel',
  //         status: 'Ativo',
  //         origin: 'Regra automática',
  //       },
  //       {
  //         segment: 'Promissor',
  //         status: 'Ativo',
  //         origin: 'Campanha X',
  //       },
  //       {
  //         segment: 'Quase Dormente',
  //         status: 'Inativo',
  //         origin: 'Regra temporal',
  //       },
  //     ],
  //   }
  // },

  /**
   * Atualiza a preferência de opt-in do WhatsApp do cliente
   */
  async updateWhatsappOptin(
    companyId: string,
    customerId: string,
    optin: boolean
  ): Promise<void> {
    await client.patch(`/companies/${companyId}/customers/${customerId}`, {
      whatsappOptin: optin,
    })
  },

  /**
   * Busca métricas gerais da base de clientes
   */
  async getCustomerMetrics(
    companyId: string
  ): Promise<CustomerMetricsResponse> {
    const response = await client.get<DashCustomersProps>(
      `/dashboard/customers-summary/${companyId}`
    )

    // newCustomersPeriodDays usa valor padrão de 30 dias
    return {
      data: {
        totalCustomers: response.data.totalCustomers,
        activeCustomers: response.data.activeCustomers,
        inactiveCustomers: response.data.inactiveCustomers,
        newCustomers: response.data.newCustomers,
        newCustomersPeriodDays: 30, // pode ser ajustado se o endpoint retornar
        achievableCustomers: response.data.achievableCustomers,
        unattainableCustomers: response.data.unattainableCustomers,
        leads: response.data.leads,
      },
    }
  },

  // ==================== WhatsApp Import Methods ====================

  /**
   * Busca clientes disponíveis para importação do WhatsApp
   * Utiliza o endpoint GET /whatsapp/companies/${companyId}/contacts
   * e mapeia contatos para o formato WhatsAppCustomer
   */
  async getWhatsAppCustomers(companyId: string): Promise<{
    data: WhatsAppCustomer[]
    meta: null
    profileInfo: {
      phoneNumber: string
      profilePic: string
      profileName: string
    }
  }> {
    const response = await whatsappService.getContacts(companyId)
    const contacts = response.data.contacts

    // Mapear contatos para WhatsAppCustomer
    const mappedCustomers = contacts.map(mapWhatsAppContactToCustomer)

    return {
      data: mappedCustomers,
      meta: null,
      profileInfo: {
        phoneNumber: response.data.phoneNumber,
        profilePic: response.data.profilePic,
        profileName: response.data.profileName,
      },
    }
  },

  /**
   * Importa clientes selecionados do WhatsApp
   * Endpoint: POST /companies/${companyId}/customers/import
   * Body: CustomerImport[] (array de objetos completos)
   */
  async importWhatsAppCustomers(
    companyId: string,
    customers: WhatsAppCustomer[]
  ): Promise<{ message: string; totalCustomers: number }> {
    // Mapear WhatsAppCustomer[] para CustomerImport[]
    const customersToImport = customers.map(mapWhatsAppCustomerToImport)

    // Usar o endpoint existente que já funciona com o componente CSV
    const response = await client.post<{
      message: string
      totalCustomers: number
    }>(`/companies/${companyId}/customers/import`, customersToImport)
    return response.data
  },

  // ==================== RFV Matrix Methods ====================

  /**
   * Busca dados da Matriz RFV (Recência, Frequência, Valor)
   * Reutiliza o endpoint /companies/${companyId}/customers/summary
   * que já retorna segmentos RFV com contagens
   *
   * @param companyId - ID da empresa
   * @returns Dados agregados por segmento RFV
   */
  async getRfvMatrix(companyId: string): Promise<{ data: RfvMatrixData }> {
    // Usa o mesmo endpoint do CustomerSummaryWidget
    const response = await client.get<
      Array<{
        segmentation: string
        count: number
        label: string
        icon: string
      }>
    >(`/companies/${companyId}/customers/summary`)

    // Mapeia array de segmentos para estrutura RfvMatrixData
    const rfvData = mapSummaryToRfvMatrix(response.data)

    return { data: rfvData }
  },
}
