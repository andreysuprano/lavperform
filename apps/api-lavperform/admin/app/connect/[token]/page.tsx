"use client"

import { use } from "react"

import { PublicConnectView } from "@/features/whatsapp/components/public-connect-view"

export default function PublicConnectPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  return <PublicConnectView token={token} />
}
