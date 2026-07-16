import { ThemeConfig } from '../white-label.types'

export const defaultTheme: ThemeConfig = {
  id: 'default',
  name: 'FoodCRM',
  colorPalette: 'yellow',
  colors: {
    primary: '#ffc900',
  },
  images: {
    favicon: '/default/favicon.ico',
    logo: '/default/logo.png',
    logoDark: '/default/logo_dark.png',
    logoIcon: '/default/logo_icon.png',
    loginBackground: '/default/bg_login.png',
    defaultBackground: '/default/bg_default.png',
    pwaIcon192: '/default/pwa-192x192.png',
    pwaIcon512: '/default/pwa-512x512.png',
    bannerCampanhas: '/default/banner_campanhas.png',
  },
  texts: {
    link: 'https://foodcrm.com',
    appName: 'FoodCRM',
    appShortName: 'FoodCRM',
    appDescription:
      'Sistema personalizado de gestão de restaurantes, lanchonetes e delivery',
    copyright: '© 2025 FoodCRM. Todos os direitos reservados.',
    redirectWhatsAppPage:
      'https://wa.me/5541992044046?text=Conheci%20o%20FoodCRM%20através%20do%20Rafa%20e%20gostaria%20de%20saber%20como%20posso%20impulsionar%20minhas%20vendas%20através%20da%20plataforma!',
    authPageLayout: {
      heroTitle: 'Revolucione a comunicação com seus clientes',
      heroDescription:
        'Comunique-se com seus clientes de forma inteligente, fidelize-os e aumente sua receita.',
    },
  },
  features: {
    hasDelivery: true,
  },
}
