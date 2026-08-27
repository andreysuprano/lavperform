import { ThemeConfig } from '../white-label.types'

export const seldTheme: ThemeConfig = {
  id: 'seld',
  name: 'SELD - LavPerform',
  colorPalette: 'cyan',
  colors: {
    // primary: '#093a58',
    primary: '#7bc9f1',
  },
  images: {
    favicon: '/seld/favicon.ico',
    logo: '/seld/logo.png',
    logoDark: '/seld/logo_dark.png',
    logoIcon: '/seld/logo_icon.png',
    loginBackground: '/seld/bg_login.png',
    defaultBackground: '/seld/bg_default.png',
    pwaIcon192: '/seld/pwa-192x192.png',
    pwaIcon512: '/seld/pwa-512x512.png',
  },
  texts: {
    link: 'https://lavperform.com',
    appName: 'LavPerform',
    appShortName: 'LavPerform',
    appDescription: 'Sistema personalizado de gestão de clientes',
    copyright: '© 2025 LavPerform. Todos os direitos reservados.',
    redirectWhatsAppPage:
      'https://wa.me/5541992044046?text=Conheci%20o%20LavPerform%20atrav%C3%A9s%20do%20Rafa%20e%20gostaria%20de%20saber%20como%20posso%20impulsionar%20minhas%20vendas%20atrav%C3%A9s%20da%20plataforma!',
    authPageLayout: {
      heroTitle: 'Revolucione a comunicação com seus clientes',
      heroDescription:
        'Comunique-se com seus clientes de forma inteligente, fidelize-os e aumente sua receita.',
    },
  },
  features: {
    hasDelivery: false,
  },
}
