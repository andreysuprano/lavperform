/**
 * Utilitário para construir URL da landing page pública
 * Baseado em customDomain ou slug retornado pelo backend
 */

const LANDING_PAGE_BASE_URL = 'https://landing.lavperform.cloud'

/**
 * Constrói a URL da landing page pública baseada nos dados retornados pelo backend
 * @param customDomain - Domínio customizado (ex: "overfood.com.br")
 * @param slug - Slug da empresa (ex: "over-food")
 * @returns URL completa da landing page
 */
export function buildLandingPageUrl(
  customDomain?: string,
  slug?: string
): string {
  // Se houver customDomain, usa ele diretamente
  if (customDomain) {
    // Garante que tenha protocolo
    if (customDomain.startsWith('http://') || customDomain.startsWith('https://')) {
      return customDomain
    }
    return `https://${customDomain}`
  }

  // Se não houver customDomain mas houver slug, usa o base URL + slug
  if (slug) {
    return `${LANDING_PAGE_BASE_URL}/${slug}`
  }

  // Fallback: retorna apenas o base URL
  return LANDING_PAGE_BASE_URL
}
