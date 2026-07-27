import { NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || "https://api.lavperform.cloud"
const COMMON_DOMAIN_RAW = process.env.COMMON_DOMAIN || "lavperform.cloud"
// Remove a porta do COMMON_DOMAIN para comparação consistente
const COMMON_DOMAIN = COMMON_DOMAIN_RAW.split(":")[0]

/**
 * Extrai o domínio da requisição (sem porta)
 */
function getRequestDomain(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  // Remove a porta se existir (ex: localhost:3000 -> localhost)
  return host.split(":")[0]
}

/**
 * Extrai o slug da URL da requisição
 * Espera que o slug seja passado como query parameter: ?slug=over-food
 */
function getSlugFromRequest(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url)
  return searchParams.get("slug")
}

/**
 * Busca os dados da landing page pela API externa
 * - Se o domínio for o COMMON_DOMAIN, busca pelo slug
 * - Se for um domínio customizado, busca pelo domínio
 */
async function fetchLandingPageData(request: NextRequest) {
  const domain = getRequestDomain(request)
  const isCommonDomain = domain === COMMON_DOMAIN || domain.endsWith(`.${COMMON_DOMAIN}`)
  
  let apiUrl: string
  
  if (isCommonDomain) {
    // Busca pelo slug quando é o domínio comum
    const slug = getSlugFromRequest(request)
    
    if (!slug) {
      return {
        error: "SLUG_REQUIRED",
        message: "Slug é obrigatório para requisições do domínio comum",
        status: 400,
      }
    }
    
    apiUrl = `${API_BASE_URL}/landing-page/slug/${slug}`
  } else {
    // Busca pelo domínio customizado
    apiUrl = `${API_BASE_URL}/landing-page/domain/${domain}`
  }
  
  const response = await fetch(apiUrl, {
    headers: {
      "Accept": "*/*",
    },
    // Cache de 60 segundos para melhor performance
    next: { revalidate: 60 },
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return {
        error: "NOT_FOUND",
        message: "Landing page não encontrada",
        status: 404,
      }
    }
    
    return {
      error: "API_ERROR",
      message: `Erro ao buscar dados: ${response.status} ${response.statusText}`,
      status: response.status,
    }
  }
  
  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const data = await fetchLandingPageData(request)
    
    // Verifica se retornou um erro
    if (data.error) {
      return NextResponse.json(
        { error: data.error, message: data.message },
        { status: data.status }
      )
    }
    
    return NextResponse.json({...data})
    
  } catch (error) {
    console.error("Erro ao buscar configuração da landing page:", error)
    
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
