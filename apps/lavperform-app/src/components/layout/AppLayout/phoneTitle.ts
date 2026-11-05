const TAB_ROOTS = new Set([
  '/dashboard',
  '/customers',
  '/social/generator',
  '/campaigns',
  '/mais',
])

export function phoneTitle(pathname: string): string {
  if (pathname === '/trocar-loja') return 'Trocar loja'
  if (pathname === '/mais' || pathname.startsWith('/mais/')) return 'Mais'
  if (pathname.startsWith('/customers')) return 'Clientes'
  if (pathname.startsWith('/social/editor')) return 'Editar post'
  if (pathname.startsWith('/social/revise')) return 'Revisar post'
  if (pathname.startsWith('/social')) return 'Redes Sociais'
  if (pathname.startsWith('/campaigns')) return 'Fidelização'
  if (pathname.startsWith('/dashboard') || pathname === '/') return 'Início'
  if (pathname.startsWith('/settings/brand-identity')) return 'Identidade da marca'
  if (pathname.startsWith('/settings/wallet')) return 'Carteira'
  if (pathname.startsWith('/billing')) return 'Financeiro'
  if (pathname.startsWith('/settings')) return 'Ajustes'
  if (pathname.startsWith('/channels')) return 'Canais de Comunicação'
  if (pathname.startsWith('/integrations')) return 'Integrações'
  if (pathname.startsWith('/trafego')) return 'Tráfego'
  if (pathname.startsWith('/academy')) return 'Academy'
  if (pathname.startsWith('/whitelabel/ai-agent')) return 'Agente de IA'
  if (pathname.startsWith('/whitelabel/weather')) return 'Clima e Tempo'
  if (pathname.startsWith('/whitelabel/landing-page')) return 'Landing Page'
  if (pathname.startsWith('/my-page')) return 'Minha Página'
  if (pathname.startsWith('/admin')) return 'Admin'
  return 'LavPerform'
}

export function phoneShowsBack(pathname: string): boolean {
  if (pathname === '/trocar-loja') return true
  return !TAB_ROOTS.has(pathname)
}

export function isTabActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/' || pathname.startsWith('/dashboard')
  }
  if (href === '/mais') {
    return (
      pathname === '/mais' ||
      pathname.startsWith('/mais/') ||
      pathname === '/trocar-loja'
    )
  }
  if (href === '/social/generator') {
    return pathname.startsWith('/social')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
