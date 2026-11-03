const EVENT_HANDLER = /(^|[\s<])on[a-z]+\s*=/i
const JAVASCRIPT_URL = /javascript\s*:/i
const SCRIPT_SRC = /<script\b[^>]*\bsrc\s*=/i
const INSTALL_CALL =
  /\(\s*window\s*,\s*document\s*,\s*(['"])script\1\s*,\s*\1dataLayer\1\s*,\s*\1(GTM-[A-Z0-9]{4,12})\1\s*\)/g
const HTTP_URL = /https?:\/\/[^\s"'<>]+/g
const GTM_JS = 'https://www.googletagmanager.com/gtm.js?id='
const NS_HTML = 'https://www.googletagmanager.com/ns.html'

function countMarker(text: string, marker: string) {
  return text.split(marker).length - 1
}

export function parseGoogleTagManagerCode(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (
    EVENT_HANDLER.test(text) ||
    JAVASCRIPT_URL.test(text) ||
    SCRIPT_SRC.test(text)
  ) {
    return null
  }

  const calls = [...text.matchAll(INSTALL_CALL)]
  if (calls.length !== 1) return null
  const containerId = calls[0][2]
  if (!/^GTM-[A-Z0-9]{4,12}$/.test(containerId)) return null

  if (countMarker(text, GTM_JS) !== 1) return null

  const nsCount = countMarker(text, NS_HTML)
  if (nsCount > 1) return null

  const ids = text.match(/GTM-[A-Za-z0-9]+/g) ?? []
  if (ids.length === 0 || ids.some((id) => id !== containerId)) return null

  const urls = text.match(HTTP_URL) ?? []
  let sawGtmJs = false
  let sawNs = false

  for (const rawUrl of urls) {
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      return null
    }

    if (url.hostname !== 'www.googletagmanager.com') return null

    if (url.pathname === '/gtm.js' && url.search.startsWith('?id=')) {
      sawGtmJs = true
      const queryId = url.searchParams.get('id')
      if (queryId && queryId !== containerId) return null
      continue
    }

    if (url.pathname === '/ns.html') {
      if (url.searchParams.get('id') !== containerId) return null
      sawNs = true
      continue
    }

    return null
  }

  if (!sawGtmJs) return null
  if (nsCount === 1 && !sawNs) return null
  return containerId
}
