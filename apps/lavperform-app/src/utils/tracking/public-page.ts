import { installGoogleTagManager } from './install-google-tag-manager'
import { installMetaPixel } from './install-meta-pixel'

type PublicCompany = {
  id?: string
  slug?: string
  name?: string
  avatarUrl?: string | null
  phone?: string | null
  address?: unknown
  metaPixelId?: string | null
  gtmContainerId?: string | null
  linkPages?: Array<Record<string, unknown>>
}

export function formatPublicCompanyPage(
  company: PublicCompany,
  page?: Record<string, unknown> | null
) {
  const result: Record<string, unknown> = {
    ...company,
    ...(page ?? {}),
  }
  result.id = company.id
  result.slug = company.slug
  result.name = company.name
  result.avatarUrl = company.avatarUrl
  result.phone = company.phone
  result.address = company.address
  result.metaPixelId = company.metaPixelId ?? null
  result.gtmContainerId = company.gtmContainerId ?? null
  if (page) {
    result.pageId = page.id
    result.type = page.type ?? 'LINK_HUB'
  }
  return result
}

export function selectPublicLinkPage(
  company: { linkPages?: Array<Record<string, unknown>> } | null | undefined,
  pageSlug?: string
) {
  const pages = company?.linkPages ?? []
  if (!pages.length) return undefined
  if (pageSlug) {
    const match = pages.find((page) => page?.slug === pageSlug)
    if (match) return match
  }
  return pages[0]
}

export function formatPublicLinkResponse(
  company: PublicCompany,
  pageSlug?: string
) {
  return formatPublicCompanyPage(company, selectPublicLinkPage(company, pageSlug))
}

export function syncPublicTracking(input: {
  isPreview: boolean
  metaPixelId?: string | null
  gtmContainerId?: string | null
  installPixel?: (pixelId: string) => void
  installGtm?: (containerId: string) => void
}) {
  if (input.isPreview) return
  const installGtm = input.installGtm ?? installGoogleTagManager
  const installPixel = input.installPixel ?? installMetaPixel
  if (input.gtmContainerId) installGtm(input.gtmContainerId)
  if (input.metaPixelId) installPixel(input.metaPixelId)
}
