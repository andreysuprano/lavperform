import { memo } from 'react'

import { PropsSubmenu } from './AppLayout.types'

/**
 * O painel lateral separado foi substituído pelo accordion dentro da sidebar.
 * O componente permanece para não quebrar imports antigos e não renderiza nada.
 */
function AppSubMenuBase(props: PropsSubmenu) {
  void props
  return null
}

const AppSubMenu = memo(AppSubMenuBase) as typeof AppSubMenuBase

export { AppSubMenu }
