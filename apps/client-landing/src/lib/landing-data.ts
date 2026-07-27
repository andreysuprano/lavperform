import { LaundryData } from "@/types/laundry"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

const COMMON_DOMAIN_RAW = process.env.COMMON_DOMAIN || "lavperform.cloud"
export const COMMON_DOMAIN = COMMON_DOMAIN_RAW.split(":")[0]

export function isCommonDomain(host: string): boolean {
  const domain = host.split(":")[0]
  return domain === COMMON_DOMAIN || domain.endsWith(`.${COMMON_DOMAIN}`)
}

export async function fetchLaundryConfig(options?: {
  slug?: string
}): Promise<LaundryData | null> {
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"

  if (!options?.slug && isCommonDomain(host)) {
    return null
  }

  const apiUrl = new URL("/api/config", `${protocol}://${host}`)
  if (options?.slug) {
    apiUrl.searchParams.set("slug", options.slug)
  }

  const response = await fetch(apiUrl.toString(), {
    headers: {
      host,
      "x-forwarded-host": host,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  if (data.error) {
    return null
  }

  return data
}

export async function getLaundryData(slug?: string): Promise<LaundryData> {
  const data = await fetchLaundryConfig(slug ? { slug } : undefined)

  if (!data) {
    notFound()
  }

  return data
}
