/**
 * Utilitário para preload de chunks críticos
 * Carrega antecipadamente componentes que serão necessários
 */

// Preload de rotas críticas (mais acessadas)
export const preloadDashboard = () =>
  import('@/pages/dashboard/DashboardPage/').then((module) => ({
    default: module.Home,
  }))

export const preloadCustomers = () =>
  import('@/pages/customers/CustomersPage').then((module) => ({
    default: module.CustomersPage,
  }))

export const preloadCampaigns = () =>
  import('@/pages/campaign/CampaignIndexPage').then((module) => ({
    default: module.CampaignIndexPage,
  }))

// Preload de componentes críticos usados em várias páginas
export const preloadCriticalComponents = () => {
  // Componentes de campanha (usados em múltiplas páginas)
  import(
    '@/components/features/customers/CustomerSummaryWidget/CustomerSummaryWidget'
  )
  import('@/components/common')
}

/**
 * Preload inteligente baseado em idle time
 * Carrega chunks quando o navegador está ocioso
 */
export const preloadOnIdle = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        preloadDashboard()
        preloadCustomers()
        preloadCriticalComponents()
      },
      { timeout: 2000 }
    )
  } else {
    // Fallback para navegadores que não suportam requestIdleCallback
    setTimeout(() => {
      preloadDashboard()
      preloadCustomers()
      preloadCriticalComponents()
    }, 1000)
  }
}

/**
 * Preload baseado em hover (quando usuário passa mouse no menu)
 */
export const preloadRouteOnHover = (routeName: string) => {
  switch (routeName) {
    case 'dashboard':
      preloadDashboard()
      break
    case 'customers':
      preloadCustomers()
      break
    case 'campaigns':
      preloadCampaigns()
      break
  }
}
