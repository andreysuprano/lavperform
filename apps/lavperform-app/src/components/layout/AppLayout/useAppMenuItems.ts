import { useMemo } from 'react'

import { useAuth } from '@/context/AuthContext'
import { useMetaIntegrationAvailability } from '@/hooks/queries'
import {
  ADMIN_MENU_ITEM,
  FOODCRM_MENU_ITEMS,
  MENU_ITEMS,
  visibleMenuItems,
} from '@/utils/constants/appMenuLinks'
import { withoutTrafficMenu } from '@/utils/tracking/traffic-access'
import { WHITELABEL_MENU_ITEMS } from '@/whitelabel/constants'
import { useHasLandingPage, useWhitelabelActive } from '@/whitelabel/hooks'

function applyMetaCreativesVisibility<
  T extends {
    href: string
    links?: Array<{ href: string; requiresMetaApi?: boolean }>
  },
>(items: T[], metaApiAvailable: boolean): T[] {
  return items.map((item) => {
    if (!item.links?.some((link) => link.requiresMetaApi)) return item

    const links = item.links.filter(
      (link) => !link.requiresMetaApi || metaApiAvailable
    )

    return { ...item, links }
  })
}

function applyLandingPageVisibility<
  T extends { href: string; links?: unknown },
>(items: T[], hasLandingPage: boolean): T[] {
  return items.map((item) => {
    if (item.href !== '/whitelabel/landing-page') return item
    if (!hasLandingPage) {
      const rest = { ...item }
      delete rest.links
      return rest
    }
    return item
  })
}

export function useAppMenuItems() {
  const { isAdmin, selectedCompany } = useAuth()
  const { isActive: isWhitelabelActive } = useWhitelabelActive()
  const { hasLandingPage } = useHasLandingPage()
  const { data: metaAvailability } = useMetaIntegrationAvailability(
    selectedCompany?.id
  )

  return useMemo(() => {
    let items = visibleMenuItems(MENU_ITEMS)
    const integrationsIndex = items.findIndex(
      (item) => item.href === '/integrations'
    )

    if (isWhitelabelActive) {
      const whitelabelItems = applyLandingPageVisibility(
        WHITELABEL_MENU_ITEMS,
        hasLandingPage
      )
      if (integrationsIndex !== -1) {
        items.splice(integrationsIndex, 0, ...whitelabelItems)
      } else {
        items.push(...whitelabelItems)
      }
    }

    const ajustesIndex = items.findIndex((item) => item.href === '/settings')
    const myPageAt = ajustesIndex === -1 ? items.length : ajustesIndex + 1
    items.splice(myPageAt, 0, ...FOODCRM_MENU_ITEMS)

    if (isAdmin) {
      items.push(...ADMIN_MENU_ITEM)
    }

    items = applyMetaCreativesVisibility(
      items,
      metaAvailability?.available === true
    )

    return withoutTrafficMenu(items, selectedCompany?.permissions)
  }, [
    hasLandingPage,
    isAdmin,
    isWhitelabelActive,
    metaAvailability?.available,
    selectedCompany?.permissions,
  ])
}
