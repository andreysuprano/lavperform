import { fetchLaundryConfig } from "@/lib/landing-data"
import { createStoreIconResponse } from "@/lib/store-icon"

export const dynamic = "force-dynamic"

export default async function AppleIcon() {
  const data = await fetchLaundryConfig()
  return createStoreIconResponse(data?.branding.logo)
}
