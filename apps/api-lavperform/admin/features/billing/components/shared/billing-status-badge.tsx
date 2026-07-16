"use client"

import { Badge } from "@/components/ui/badge"

import {
  paymentStatusLabel,
  paymentStatusVariant,
  topupStatusLabel,
  topupStatusVariant,
} from "../../utils"

export function PaymentStatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="secondary">—</Badge>
  return (
    <Badge variant={paymentStatusVariant(status)}>
      {paymentStatusLabel(status)}
    </Badge>
  )
}

export function TopupStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={topupStatusVariant(status)}>
      {topupStatusLabel(status)}
    </Badge>
  )
}
