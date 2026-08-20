import { GrCycle, GrGraphQl, GrTarget } from 'react-icons/gr'
import {
  LuBrain,
  LuCalendarSync,
  LuChartColumnBig,
  LuClock,
  LuCoins,
  LuDollarSign,
  LuLayoutTemplate,
  LuList,
  LuPlug,
  LuRadio,
  LuTimer,
  LuUserRound,
  LuWallet,
} from 'react-icons/lu'
import { MdOutlineContactPage } from 'react-icons/md'
import {
  PiBuildings,
  PiCalendarCheck,
  PiHandshake,
  PiMonitorPlay,
  PiSlideshowBold,
} from 'react-icons/pi'
import {
  RiAdminLine,
  RiDashboardLine,
  RiSettings4Line,
  RiUserLine,
} from 'react-icons/ri'

// Dados do menu definidos fora do componente para evitar recriação
export const MENU_ITEMS = [
  {
    label: 'Dashboard',
    icon: RiDashboardLine,
    href: '/dashboard',
    isNew: false,
  },
  {
    label: 'Fidelização e Recorrência',
    icon: GrCycle,
    href: '/campaigns',
    isNew: false,
    links: [
      {
        label: 'Insights',
        href: '/campaigns',
        icon: LuChartColumnBig,
      },
      {
        label: 'Campanhas',
        href: '/campaigns/recurring-campaigns',
        icon: LuCalendarSync,
      },
      {
        label: 'Templates',
        href: '/campaigns/templates',
        icon: LuLayoutTemplate,
        requiresMetaApi: true,
      },
    ],
  },
  {
    label: 'Clientes',
    icon: RiUserLine,
    href: '/customers',
    isNew: false,
    links: [
      {
        label: 'Insights',
        href: '/customers/insights',
        icon: LuBrain,
      },
      {
        label: 'Base de clientes',
        href: '/customers/CustomerBase',
        icon: LuUserRound,
      },
      {
        label: 'Audiências',
        href: '/customers/audiences',
        icon: GrTarget,
      },
      {
        label: 'Listas personalizadas',
        href: '/customers/custom-send-lists',
        icon: LuList,
      },
      {
        label: 'Matriz RFV',
        href: '/customers/clientDetails',
        icon: GrGraphQl,
      },
    ],
  },
  {
    label: 'Canais de Comunicação',
    icon: LuRadio,
    href: '/channels',
    isNew: false,
  },
  {
    label: 'Integrações',
    icon: LuPlug,
    href: '/integrations',
    isNew: false,
  },
  {
    label: 'Ajustes',
    icon: RiSettings4Line,
    href: '/settings',
    isNew: false,
    links: [
      {
        label: 'Carteira',
        href: '/settings/wallet',
        icon: LuWallet,
      },
      {
        label: 'Janela de Atribuição',
        href: '/settings/attribution-window',
        icon: LuClock,
      },
      {
        label: 'Parâmetros Matriz RFV/RFM',
        href: '/settings/rfv-attribution',
        icon: GrTarget,
      },
      {
        label: 'Renitência',
        href: '/settings/renitency',
        icon: LuTimer,
      },
    ],
  },
]

// Itens de menu exclusivos para FoodCRM (projeto principal)
// Aparecem apenas quando VITE_THEME_ID === 'default'
export const FOODCRM_MENU_ITEMS = [
  {
    label: 'Minha Página',
    icon: MdOutlineContactPage,
    href: '/my-page',
    isNew: false,
  },
]

// FoodAds: desabilitado até o lançamento (tema default). Reativar em AppLayout quando pronto.
// export const FOODADS_MENU_ITEMS = [
//   {
//     label: 'FoodAds',
//     icon: LuMegaphone,
//     href: '/foodads',
//     isNew: true,
//     links: [
//       { label: 'FoodAds', href: '/foodads', icon: LuMegaphone },
//       { label: 'Overview', href: '/foodads/overview', icon: RiBarChartLine },
//       { label: 'Campanhas', href: '/foodads/campaigns', icon: LuRocket },
//     ],
//   },
// ]
export const FOODADS_MENU_ITEMS: typeof FOODCRM_MENU_ITEMS = []

// Re-export do whitelabel: itens de menu ficam no domínio whitelabel
export { WHITELABEL_MENU_ITEMS } from '@/whitelabel/constants'

export const ACADEMY_MENU_ITEM = {
  label: 'Academy',
  icon: PiMonitorPlay,
  href: '/academy',
  isNew: false,
}

export const OPEN_API_DOCS = {
  label: 'Conheça a nossa API Aberta',
  description: 'Integre com os sistemas que você já usa!',
  ctaLabel: 'Acessar a documentação',
  icon: LuPlug,
  href: 'https://docs.foodcrm.com.br',
}

// Itens de admin separados para facilitar adição condicional
export const ADMIN_MENU_ITEM = [
  {
    label: 'Admin',
    icon: RiAdminLine,
    href: '/admin',
    isNew: false,
    links: [
      {
        label: 'Empresas',
        href: '/admin/companies',
        icon: PiBuildings,
      },
      {
        label: 'Créditos',
        href: '/admin/credits',
        icon: LuCoins,
      },
      {
        label: 'Produtos Default',
        href: '/admin/credits/default-products',
        icon: LuCoins,
      },
      {
        label: 'Cursos',
        href: '/admin/courses',
        icon: PiMonitorPlay,
      },
      {
        label: 'Carrousel',
        href: '/admin/carrousel',
        icon: PiSlideshowBold,
      },
      {
        label: 'Eventos da Semana',
        href: '/admin/week-events',
        icon: PiCalendarCheck,
      },
      {
        label: 'Parceiros',
        href: '/admin/partners',
        icon: PiHandshake,
      },
    ],
  },
]

// Itens adicionais apenas para mobile
export const MOBILE_ONLY_ITEMS = [
  { ...ACADEMY_MENU_ITEM },
  {
    label: 'Financeiro',
    icon: LuDollarSign,
    href: '/billing',
    isNew: false,
  },
  {
    label: 'Ajustes',
    icon: RiSettings4Line,
    href: '/settings',
    isNew: false,
  },
]
