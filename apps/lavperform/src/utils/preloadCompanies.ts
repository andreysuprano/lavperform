import type { PreloadCompany, UserCompany } from '@/types'

/**
 * Mapeia empresas do GET /application/preload para o formato usado no AuthContext (UserCompany).
 */
export function mapPreloadCompaniesToUserCompanies(
  preloadCompanies: PreloadCompany[]
): UserCompany[] {
  return preloadCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    avatarUrl: c.avatarUrl ?? '',
    slug: c.slug ?? '',
    companyId: c.id,
  }))
}
