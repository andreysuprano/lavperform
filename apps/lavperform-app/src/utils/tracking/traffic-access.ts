export function companyHasTrafficRead(
  permissions: readonly string[] | null | undefined
) {
  if (!Array.isArray(permissions)) return true
  return permissions.includes('traffic.read')
}

export function isOnlyTrafficRead(
  permissions: readonly string[] | null | undefined
) {
  return (
    Array.isArray(permissions) &&
    permissions.length === 1 &&
    permissions[0] === 'traffic.read'
  )
}

export function trafficHomePath(
  permissions: readonly string[] | null | undefined
) {
  return isOnlyTrafficRead(permissions) ? '/trafego' : '/dashboard'
}

export function trafficRouteRedirect(
  permissions: readonly string[] | null | undefined,
  pathname: string
) {
  const onTraffic = pathname === '/trafego' || pathname.startsWith('/trafego/')
  if (!onTraffic) return null
  if (!companyHasTrafficRead(permissions)) return '/dashboard'
  if (
    isOnlyTrafficRead(permissions) &&
    (pathname === '/trafego/pixel' ||
      pathname === '/trafego/gtm' ||
      pathname.startsWith('/trafego/pixel/') ||
      pathname.startsWith('/trafego/gtm/'))
  ) {
    return '/trafego'
  }
  return null
}

export function withoutTrafficMenu<T extends { href: string }>(
  items: T[],
  permissions: readonly string[] | null | undefined
) {
  if (companyHasTrafficRead(permissions)) return items
  return items.filter((item) => item.href !== '/trafego')
}
