const loadedContainers = new Set<string>()

type DataLayerEvent = Record<string, unknown>

function insertBeforeFirstScript(script: HTMLScriptElement) {
  const first = document.getElementsByTagName('script')[0]
  if (first?.parentNode) {
    first.parentNode.insertBefore(script, first)
    return
  }
  ;(document.head ?? document.documentElement).appendChild(script)
}

export function resetGoogleTagManagerInstallForTests() {
  loadedContainers.clear()
  delete (window as Window & { dataLayer?: unknown }).dataLayer
  document
    .querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')
    .forEach((node) => node.remove())
}

export function installGoogleTagManager(containerId: string) {
  const host = window as Window & { dataLayer?: DataLayerEvent[] }
  if (!Array.isArray(host.dataLayer)) host.dataLayer = []

  if (!loadedContainers.has(containerId)) {
    host.dataLayer.push({
      'gtm.start': Date.now(),
      event: 'gtm.js',
    })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`
    insertBeforeFirstScript(script)
    loadedContainers.add(containerId)
  }

  host.dataLayer.push({
    event: 'page_view',
    page_path: `${window.location.pathname}${window.location.search}`,
    page_location: window.location.href,
  })
}
