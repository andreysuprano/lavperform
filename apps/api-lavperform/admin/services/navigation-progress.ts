const NAVIGATION_MIN_MS = 200

type NavigationState = {
  isNavigating: boolean
  targetPathname: string | null
  startedAt: number
}

let state: NavigationState = {
  isNavigating: false,
  targetPathname: null,
  startedAt: 0,
}

const listeners = new Set<() => void>()

export function getNavigationState(): NavigationState {
  return state
}

export function subscribeNavigation(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

export function startNavigation(targetPathname: string): void {
  state = {
    isNavigating: true,
    targetPathname,
    startedAt: Date.now(),
  }
  notifyListeners()
}

export function endNavigation(): void {
  if (!state.isNavigating) return

  state = {
    isNavigating: false,
    targetPathname: null,
    startedAt: 0,
  }
  notifyListeners()
}

export function getNavigationMinDurationMs(): number {
  return NAVIGATION_MIN_MS
}

export function isModifiedNavigationClick(event: MouseEvent): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

export function getInternalLinkPathname(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null
  }

  const target = anchor.getAttribute("target")
  if (target && target !== "_self") {
    return null
  }

  try {
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) {
      return null
    }

    return url.pathname
  } catch {
    return null
  }
}

export function getPathnameFromHref(href: string): string {
  try {
    return new URL(href, window.location.origin).pathname
  } catch {
    return href.split("?")[0] ?? href
  }
}
