import { fetchLaundryConfig } from "@/lib/landing-data"
import { createStoreIconResponse } from "@/lib/store-icon"

export const dynamic = "force-dynamic"

interface IconProps {
  params: Promise<{ slug: string }>
}

export default async function Icon({ params }: IconProps) {
  const { slug } = await params
  const data = await fetchLaundryConfig({ slug })
  return createStoreIconResponse(data?.branding.logo)
}
