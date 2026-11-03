const initializedPixels = new Set<string>()

type FbqStub = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: FbqStub
  loaded: boolean
  version: string
}

function insertBeforeFirstScript(script: HTMLScriptElement) {
  const first = document.getElementsByTagName('script')[0]
  if (first?.parentNode) {
    first.parentNode.insertBefore(script, first)
    return
  }
  ;(document.head ?? document.documentElement).appendChild(script)
}

export function resetMetaPixelInstallForTests() {
  initializedPixels.clear()
  delete (window as Window & { fbq?: unknown; _fbq?: unknown }).fbq
  delete (window as Window & { fbq?: unknown; _fbq?: unknown })._fbq
  document
    .querySelectorAll('script[src*="fbevents.js"]')
    .forEach((node) => node.remove())
}

export function installMetaPixel(pixelId: string) {
  const host = window as Window & { fbq?: FbqStub; _fbq?: FbqStub }
  if (!host.fbq) {
    let fbq: FbqStub
    fbq = Object.assign(
      (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args)
        else fbq.queue.push(args)
      },
      {
        queue: [] as unknown[],
        loaded: true,
        version: '2.0',
        push: undefined as unknown as FbqStub,
      }
    ) as FbqStub
    fbq.push = fbq
    if (!host._fbq) host._fbq = fbq
    host.fbq = fbq

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    insertBeforeFirstScript(script)
  }

  if (!initializedPixels.has(pixelId)) {
    host.fbq('init', pixelId)
    initializedPixels.add(pixelId)
  }
  host.fbq('track', 'PageView')
}
