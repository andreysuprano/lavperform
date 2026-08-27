import { ThemeConfig } from '../white-label.types'

export const exampleTheme: ThemeConfig = {
  id: 'example',
  name: 'LavPerform',
  colorPalette: 'cyan',
  colors: {
    // primary: '#093a58',
    primary: '#7bc9f1',
  },
  images: {
    favicon: '/custom/favicon.ico',
    logo: '/custom/logo.png',
    logoDark: '/custom/logo_dark.png',
    logoIcon: '/custom/logo_icon.png',
    loginBackground: '/custom/bg_login.png',
    defaultBackground: '/custom/bg_default.png',
    pwaIcon192: '/custom/pwa-192x192.png',
    pwaIcon512: '/custom/pwa-512x512.png',
    bannerCampanhas: '/custom/banner_campanhas.png',
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
