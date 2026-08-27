import type { IconType } from 'react-icons'

import { getBusinessCopy } from '@/config'
import {
  LuBrain,
  LuGraduationCap,
  LuLayoutDashboard,
} from 'react-icons/lu'

export type PlatformUpdate = {
  id: string
  title: string
  summary: string
  date: string
  href?: string
  icon: IconType
  colorPalette: string
}

/** Lista curada de novidades da plataforma. Edite aqui para publicar updates. */
export const PLATFORM_UPDATES: PlatformUpdate[] = [
  {
    id: 'home-ops-2026',
    title: 'Nova home operacional',
    summary:
      'Vendas do dia, saúde da base e atalhos das ações principais em um só lugar.',
    date: '2026-07-18',
    icon: LuLayoutDashboard,
    colorPalette: 'yellow',
  },
  {
    id: 'insights-clientes',
    title: 'Insights de clientes',
    summary:
      'Oportunidades de retenção, reconquista e fidelização com a matriz RFV.',
    date: '2026-06-01',
    href: '/customers/insights',
    icon: LuBrain,
    colorPalette: 'blue',
  },
  {
    id: 'academy',
    title: getBusinessCopy().academyTitle,
    summary:
      'Cursos e eventos ao vivo para usar a plataforma e vender mais.',
    date: '2026-05-15',
    href: '/academy',
    icon: LuGraduationCap,
    colorPalette: 'green',
  },
]
