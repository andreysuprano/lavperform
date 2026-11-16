const EVENT_HANDLER = /(^|[\s<])on[a-z]+\s*=/i
const JAVASCRIPT_URL = /javascript\s*:/i
const SCRIPT_SRC = /<script\b[^>]*\bsrc\s*=/i
const INIT_CALL = /fbq\(\s*(['"])init\1\s*,\s*\1(\d{10,20})\1\s*\)/g
const HTTP_URL = /https?:\/\/[^\s"'<>]+/g

function isFacebookEvents(url: URL) {
  return (
    url.protocol === 'https:' &&
    url.hostname === 'connect.facebook.net' &&
    /^\/[a-z]{2,3}_[A-Z]{2}\/fbevents\.js$/.test(url.pathname)
  )
}

export function parseMetaPixelCode(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (
    EVENT_HANDLER.test(text) ||
    JAVASCRIPT_URL.test(text) ||
    SCRIPT_SRC.test(text)
  ) {
    return null
  }

  const inits = [...text.matchAll(INIT_CALL)]
  if (inits.length !== 1) return null
  const pixelId = inits[0][2]

  const urls = text.match(HTTP_URL) ?? []
  let eventsCount = 0

  for (const rawUrl of urls) {
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      return null
    }

    if (
      url.hostname !== 'connect.facebook.net' &&
      url.hostname !== 'www.facebook.com'
    ) {
      return null
    }

    if (isFacebookEvents(url)) eventsCount += 1

    if (url.hostname === 'www.facebook.com' && url.pathname === '/tr') {
      const id = url.searchParams.get('id')
      if (id !== null && id !== pixelId) return null
    }
  }

  if (eventsCount !== 1) return null
  return pixelId
}
