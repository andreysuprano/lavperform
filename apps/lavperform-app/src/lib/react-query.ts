import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    customers: (companyId: string) =>
      ['dashboard', 'customers', companyId] as const,
    customersInsights: (companyId: string) =>
      ['dashboard', 'customers-insights', companyId] as const,
    campaigns: (companyId: string, interval: string) =>
      ['dashboard', 'campaigns', companyId, interval] as const,
  },

  orders: {
    monthlySales: (companyId: string) =>
      ['orders', 'monthly-sales', companyId] as const,
    sales: (companyId: string, page: number, limit: number) =>
      ['orders', 'sales', companyId, page, limit] as const,
  },

  saleAttribution: {
    incentivizedSales: (companyId: string, params: string) =>
      ['sale-attribution', 'incentivized-sales', companyId, params] as const,
  },

  customers: {
    all: ['customers'] as const,
    lists: (companyId: string) => ['customers', 'list', companyId] as const,
    list: (companyId: string, params: any) =>
      ['customers', 'list', companyId, params] as const,
    detail: (customerId: string) =>
      ['customers', 'detail', customerId] as const,
    summary: (companyId: string) =>
      ['customers', 'summary', companyId] as const,
    topBuyers: (
      companyId: string,
      limit: number,
      sortBy: 'totalSpent' | 'orderCount' = 'totalSpent',
      startDate?: string,
      endDate?: string
    ) =>
      [
        'customers',
        'top-buyers',
        companyId,
        limit,
        sortBy,
        startDate ?? null,
        endDate ?? null,
      ] as const,
    orders: (customerId: string) =>
      ['customers', 'orders', customerId] as const,
    rfvMatrix: (companyId: string) =>
      ['customers', 'rfv-matrix', companyId] as const,
    rfvSettings: (companyId: string) =>
      ['customers', 'rfv-settings', companyId] as const,
  },

  audiences: {
    all: ['audiences'] as const,
    lists: (companyId: string) => ['audiences', 'list', companyId] as const,
    list: (companyId: string, params: any) =>
      ['audiences', 'list', companyId, params] as const,
    detail: (companyId: string, audienceId: string) =>
      ['audiences', 'detail', companyId, audienceId] as const,
    criteria: (companyId: string) =>
      ['audiences', 'criteria', companyId] as const,
    preview: (
      companyId: string,
      definition: unknown,
      params: { page?: number; limit?: number } = {},
    ) => ['audiences', 'preview', companyId, definition, params] as const,
  },

  campaigns: {
    all: ['campaigns'] as const,
    lists: (companyId: string) => ['campaigns', 'list', companyId] as const,
    list: (companyId: string, params: any) =>
      ['campaigns', 'list', companyId, params] as const,
    detail: (campaignId: string, companyId: string) =>
      ['campaigns', 'detail', campaignId, companyId] as const,
    metrics: (campaignId: string, companyId: string, interval: string) =>
      ['campaigns', 'metrics', campaignId, companyId, interval] as const,
    messages: (campaignId: string, companyId: string) =>
      ['campaigns', 'messages', campaignId, companyId] as const,
    scheduledDispatches: (companyId: string, params: string) =>
      ['campaigns', 'scheduledDispatches', companyId, params] as const,
    attributionSegments: (companyId: string) =>
      ['campaigns', 'attributionSegments', companyId] as const,
    companyCoupons: (companyId: string) =>
      ['campaigns', 'company-coupons', companyId] as const,
    companyCouponsList: (companyId: string, params: any) =>
      ['campaigns', 'company-coupons', companyId, params] as const,
  },

  company: {
    all: ['company'] as const,
    list: (params: any) => ['company', 'list', params] as const,
    detail: (companyId: string) => ['company', 'detail', companyId] as const,
    schedule: (companyId: string) =>
      ['company', 'schedule', companyId] as const,
    integrations: (companyId: string) =>
      ['company', 'integrations', companyId] as const,
    apiKeys: {
      active: (companyId: string) =>
        ['company', 'api-keys', 'active', companyId] as const,
    },
    plans: () => ['company', 'plans'] as const,
    partner: (partnerId: string) => ['company', 'partner', partnerId] as const,
    renitency: (companyId: string) =>
      ['company', 'renitency', companyId] as const,
  },

  subscription: {
    all: ['subscription'] as const,
    detail: (companyId: string) =>
      ['subscription', 'detail', companyId] as const,
    payments: (companyId: string) =>
      ['subscription', 'payments', companyId] as const,
  },

  whatsapp: {
    all: ['whatsapp'] as const,
    status: (companyId: string) => ['whatsapp', 'status', companyId] as const,
    connection: (companyId: string) =>
      ['whatsapp', 'connection', companyId] as const,
    customers: (companyId: string) =>
      ['whatsapp', 'customers', companyId] as const,
  },

  channels: {
    whatsappWeb: {
      status: (companyId: string) =>
        ['channels', 'whatsapp-web', 'status', companyId] as const,
      connection: (companyId: string) =>
        ['channels', 'whatsapp-web', 'connection', companyId] as const,
    },
    whatsappBusinessApi: {
      availability: (companyId: string) =>
        ['channels', 'whatsapp-business-api', 'availability', companyId] as const,
      detail: (companyId: string) =>
        ['channels', 'whatsapp-business-api', 'detail', companyId] as const,
    },
  },

  metaTemplates: {
    list: (companyId: string) =>
      ['meta-templates', 'list', companyId] as const,
  },

  courses: {
    all: ['courses'] as const,
    list: (params: any) => ['courses', 'list', params] as const,
    detail: (courseId: string) => ['courses', 'detail', courseId] as const,
    carrousel: () => ['courses', 'carrousel'] as const,
    weekEvents: () => ['courses', 'week-events'] as const,
    allWeekEvents: () => ['courses', 'all-week-events'] as const,
  },

  partners: {
    all: ['partners'] as const,
    list: (params: any) => ['partners', 'list', params] as const,
    detail: (partnerId: string) => ['partners', 'detail', partnerId] as const,
  },

  credits: {
    all: ['credits'] as const,
    defaultProducts: {
      all: ['credits', 'default-products'] as const,
      list: (params: any) =>
        ['credits', 'default-products', 'list', params] as const,
      detail: (defaultProductId: string) =>
        ['credits', 'default-products', 'detail', defaultProductId] as const,
    },
    products: {
      all: (companyId: string) => ['credits', companyId, 'products'] as const,
      list: (companyId: string, params: any) =>
        ['credits', companyId, 'products', 'list', params] as const,
      detail: (companyId: string, productId: string) =>
        ['credits', companyId, 'products', 'detail', productId] as const,
    },
    effectiveProducts: {
      all: (companyId: string) =>
        ['credits', companyId, 'effective-products'] as const,
      list: (companyId: string, params: any) =>
        ['credits', companyId, 'effective-products', 'list', params] as const,
    },
    topups: {
      all: (companyId: string) => ['credits', companyId, 'topups'] as const,
      list: (companyId: string, params: any) =>
        ['credits', companyId, 'topups', 'list', params] as const,
      detail: (companyId: string, topupId: string) =>
        ['credits', companyId, 'topups', 'detail', topupId] as const,
    },
    balance: (companyId: string) => ['credits', companyId, 'balance'] as const,
    ledger: {
      list: (companyId: string, params: any) =>
        ['credits', companyId, 'ledger', params] as const,
    },
  },

  whitelabel: {
    aiAgent: {
      all: ['whitelabel', 'ai-agent'] as const,
      list: (companyId: string) =>
        ['whitelabel', 'ai-agent', 'list', companyId] as const,
      detail: (companyId: string, agentId: string) =>
        ['whitelabel', 'ai-agent', 'detail', companyId, agentId] as const,
      config: (companyId: string) =>
        ['whitelabel', 'ai-agent', 'config', companyId] as const,
      knowledgeBase: (companyId: string) =>
        ['whitelabel', 'ai-agent', 'knowledge-base', companyId] as const,
      knowledgeFiles: (companyId: string, agentId: string) =>
        [
          'whitelabel',
          'ai-agent',
          'knowledge-files',
          companyId,
          agentId,
        ] as const,
      mcpServers: (agentId: string) =>
        ['whitelabel', 'ai-agent', 'mcp-servers', agentId] as const,
      conversations: (
        companyId: string,
        agentId: string,
        page: number,
        limit: number,
        search: string
      ) =>
        [
          'whitelabel',
          'ai-agent',
          'conversations',
          companyId,
          agentId,
          page,
          limit,
          search,
        ] as const,
      conversationMessages: (
        companyId: string,
        agentId: string,
        conversationId: string
      ) =>
        [
          'whitelabel',
          'ai-agent',
          'conversation-messages',
          companyId,
          agentId,
          conversationId,
        ] as const,
    },
    landingPage: {
      config: (companyId: string) =>
        ['whitelabel', 'landing-page', 'config', companyId] as const,
      preview: (companyId: string) =>
        ['whitelabel', 'landing-page', 'preview', companyId] as const,
      public: (companyId: string) =>
        ['whitelabel', 'landing-page', 'public', companyId] as const,
      exists: (companyId: string) =>
        ['whitelabel', 'landing-page', 'exists', companyId] as const,
    },
    weather: {
      config: (companyId: string) =>
        ['whitelabel', 'weather', 'config', companyId] as const,
      history: (companyId: string) =>
        ['whitelabel', 'weather', 'history', companyId] as const,
      current: (companyId: string) =>
        ['whitelabel', 'weather', 'current', companyId] as const,
      alertConfig: (companyId: string) =>
        ['whitelabel', 'weather', 'alert-config', companyId] as const,
      alertSends: (companyId: string, params: any) =>
        ['whitelabel', 'weather', 'alert-sends', companyId, params] as const,
      alertSendDetail: (companyId: string, alertId: string) =>
        [
          'whitelabel',
          'weather',
          'alert-send-detail',
          companyId,
          alertId,
        ] as const,
    },
  },
}

export const invalidateQueries = {
  allCustomers: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),

  customersList: (companyId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.customers.lists(companyId),
    }),

  allCampaigns: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all }),

  campaignsList: (companyId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.campaigns.lists(companyId),
    }),

  dashboard: (companyId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.customers(companyId),
    }),

  companiesList: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.company.all }),

  whatsappCustomers: (companyId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.whatsapp.customers(companyId),
    }),

  rfvMatrix: (companyId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.customers.rfvMatrix(companyId),
    }),

  aiAgentsList: (companyId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.whitelabel.aiAgent.list(companyId),
    }),

  aiAgentDetail: (companyId: string, agentId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.whitelabel.aiAgent.detail(companyId, agentId),
    }),

  aiAgentKnowledgeFiles: (companyId: string, agentId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.whitelabel.aiAgent.knowledgeFiles(companyId, agentId),
    }),

  aiAgentMcpServers: (agentId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.whitelabel.aiAgent.mcpServers(agentId),
    }),
}
