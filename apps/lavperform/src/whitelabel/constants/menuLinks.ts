import { LuBot, LuCloudRain, LuMapPin, LuPlug, LuStar } from 'react-icons/lu'
import { RiPagesLine } from 'react-icons/ri'

/**
 * Itens de menu exclusivos para whitelabel (ex.: LavPerform).
 * Aparecem no layout quando whitelabel está ativo (VITE_THEME_ID !== 'default').
 * Subpáginas de "Landing Page" são exibidas/ocultadas conforme existência da landing page (AppLayout).
 */
export const WHITELABEL_MENU_ITEMS = [
  {
    label: 'Agente de IA',
    icon: LuBot,
    href: '/whitelabel/ai-agent',
    isNew: false,
  },
  {
    label: 'Clima e Tempo',
    icon: LuCloudRain,
    href: '/whitelabel/weather',
    isNew: false,
  },
  {
    label: 'Landing Page',
    icon: RiPagesLine,
    href: '/whitelabel/landing-page',
    isNew: false,
    links: [
      {
        label: 'Branding',
        href: '/whitelabel/landing-page/branding',
        icon: RiPagesLine,
      },
      {
        label: 'Banner',
        href: '/whitelabel/landing-page/hero',
        icon: RiPagesLine,
      },
      {
        label: 'Serviços',
        href: '/whitelabel/landing-page/services',
        icon: LuPlug,
      },
      {
        label: 'Localização',
        href: '/whitelabel/landing-page/location',
        icon: LuMapPin,
      },
      {
        label: 'FAQ',
        href: '/whitelabel/landing-page/faq',
        icon: RiPagesLine,
      },
      {
        label: 'Avaliações',
        href: '/whitelabel/landing-page/testimonials',
        icon: LuStar,
      },
      {
        label: 'CTA Final',
        href: '/whitelabel/landing-page/cta',
        icon: RiPagesLine,
      },
      {
        label: 'Rodapé',
        href: '/whitelabel/landing-page/footer',
        icon: RiPagesLine,
      },
    ],
  },
]
