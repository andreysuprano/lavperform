const EVENT_HANDLER = /(^|[\s<])on[a-z]+\s*=/i
const JAVASCRIPT_URL = /javascript\s*:/i
const SCRIPT_SRC = /<script\b[^>]*\bsrc\s*=/i
const INSTALL_CALL =
  /\(\s*window\s*,\s*document\s*,\s*(['"])script\1\s*,\s*\1dataLayer\1\s*,\s*\1(GTM-[A-Z0-9]{4,12})\1\s*\)/g
const HTTP_URL = /https?:\/\/[^\s"'<>]+/g
const GTM_JS = 'https://www.googletagmanager.com/gtm.js?id='
const NS_HTML = 'https://www.googletagmanager.com/ns.html'
const CONTAINER_ID = /^GTM-[A-Z0-9]{4,12}$/
const GTAG_BOOTSTRAP =
  /^\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\s*\]\s*;\s*function\s+gtag\s*\(\s*\)\s*\{\s*dataLayer\.push\s*\(\s*arguments\s*\)\s*;?\s*\}\s*gtag\s*\(\s*(['"])js\1\s*,\s*new\s+Date\s*\(\s*\)\s*\)\s*;?\s*$/

function countMarker(text: string, marker: string) {
  return text.split(marker).length - 1
}

function readAttributes(source: string) {
  const pattern =
    /\s+([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  return {
    attrs: [...source.matchAll(pattern)],
    leftover: source.replace(pattern, ''),
  }
}

function containerIdFromGtmSrc(src: string) {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if (url.hostname !== 'www.googletagmanager.com') return null
  if (url.pathname !== '/gtm.js' || url.hash) return null
  const keys = [...url.searchParams.keys()]
  if (keys.length !== 1 || keys[0] !== 'id') return null
  const id = url.searchParams.get('id')
  if (!id || !CONTAINER_ID.test(id)) return null
  return id
}

function externalScriptId(attrSource: string) {
  const { attrs, leftover } = readAttributes(attrSource)
  if (attrs.length === 0 || leftover.trim()) return null

  let src: string | null = null
  for (const attr of attrs) {
    const name = attr[1].toLowerCase()
    const quoted = attr[2] ?? attr[3]
    const hasValue = quoted !== undefined || attr[4] !== undefined
    const value = quoted ?? attr[4] ?? ''
    if (name === 'async') {
      if (hasValue && value.toLowerCase() !== 'async') return null
      continue
    }
    if (name === 'src') {
      if (src || quoted === undefined) return null
      src = quoted
      continue
    }
    return null
  }

  if (!src) return null
  return containerIdFromGtmSrc(src)
}

function stripOfficialNoscript(text: string, id: string) {
  const matches = [
    ...text.matchAll(/<noscript\b([^>]*)>([\s\S]*?)<\/noscript>/gi),
  ]
  if (matches.length > 1) return null
  if (matches.length === 0) return text
  if (matches[0][1].trim()) return null

  const iframe = matches[0][2]
    .trim()
    .match(/^<iframe\b([^>]*)>\s*<\/iframe>$/i)
  if (!iframe) return null

  const { attrs, leftover } = readAttributes(iframe[1])
  if (leftover.trim()) return null

  let sawSrc = false
  for (const attr of attrs) {
    const name = attr[1].toLowerCase()
    const value = attr[2] ?? attr[3] ?? attr[4] ?? ''
    if (name === 'src') {
      if (sawSrc) return null
      sawSrc = true
      let url: URL
      try {
        url = new URL(value)
      } catch {
        return null
      }
      if (url.protocol !== 'https:' || url.hostname !== 'www.googletagmanager.com') {
        return null
      }
      if (url.pathname !== '/ns.html' || url.searchParams.get('id') !== id) return null
      const keys = [...url.searchParams.keys()]
      if (keys.length !== 1 || keys[0] !== 'id') return null
      continue
    }
    if (name === 'height' || name === 'width') {
      if (value !== '0') return null
      continue
    }
    if (name === 'style') {
      if (value.replace(/\s/g, '').toLowerCase() !== 'display:none;visibility:hidden') {
        return null
      }
      continue
    }
    return null
  }

  if (!sawSrc) return null
  return text.replace(matches[0][0], '')
}

function parseCurrentInstall(text: string) {
  const scripts = [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  if (scripts.length !== 2) return null

  let containerId: string | null = null
  let sawInline = false

  for (const script of scripts) {
    const externalId = externalScriptId(script[1])
    if (externalId) {
      if (script[2].trim()) return null
      if (containerId && containerId !== externalId) return null
      containerId = externalId
      continue
    }
    if (script[1].trim() || sawInline || !GTAG_BOOTSTRAP.test(script[2])) return null
    sawInline = true
  }

  if (!containerId || !sawInline) return null

  const withoutScripts = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  const withoutComments = withoutScripts.replace(/<!--[\s\S]*?-->/g, '')
  const withoutNoscript = stripOfficialNoscript(withoutComments, containerId)
  if (withoutNoscript === null || withoutNoscript.trim()) return null

  const ids = text.match(/GTM-[A-Za-z0-9]+/g) ?? []
  if (ids.length === 0 || ids.some((id) => id !== containerId)) return null
  return containerId
}

function parseLegacyInstall(text: string) {
  const calls = [...text.matchAll(INSTALL_CALL)]
  if (calls.length !== 1) return null
  const containerId = calls[0][2]
  if (!CONTAINER_ID.test(containerId)) return null

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

export function parseGoogleTagManagerCode(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (EVENT_HANDLER.test(text) || JAVASCRIPT_URL.test(text)) return null
  if (SCRIPT_SRC.test(text)) return parseCurrentInstall(text)
  return parseLegacyInstall(text)
}
