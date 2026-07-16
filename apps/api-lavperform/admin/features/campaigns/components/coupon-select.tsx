"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCompanyCoupons } from "@/features/coupons/coupons-queries"
import type { Coupon } from "@/features/coupons/types"

import { formatDate } from "../utils"

const NONE_VALUE = "__none__"

function formatCouponLabel(coupon: Pick<Coupon, "code" | "description" | "validUntil">) {
  const details = [
    coupon.description?.trim() || null,
    `Válido até ${formatDate(coupon.validUntil)}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return { title: coupon.code, details }
}

export function CouponSelect({
  id,
  companyId,
  value,
  onChange,
  currentCoupon,
  placeholder = "Nenhum cupom",
  disabled,
}: {
  id?: string
  companyId: string | null | undefined
  value: string | null | undefined
  onChange: (value: string | null) => void
  currentCoupon?: Pick<Coupon, "id" | "code" | "description" | "validUntil"> | null
  placeholder?: string
  disabled?: boolean
}) {
  const { data, isLoading, error } = useCompanyCoupons(companyId)

  const coupons = data?.data ?? []
  const selectedValue = value && value !== "" ? value : NONE_VALUE

  const couponById = useMemo(() => {
    const map = new Map(coupons.map((coupon) => [coupon.id, coupon]))
    if (
      currentCoupon &&
      value === currentCoupon.id &&
      !map.has(currentCoupon.id)
    ) {
      map.set(currentCoupon.id, {
        ...currentCoupon,
        companyId: companyId ?? "",
        type: "",
        unit: "",
        value: 0,
        active: true,
        createdAt: "",
        updatedAt: "",
        description: currentCoupon.description ?? null,
      })
    }
    return map
  }, [coupons, currentCoupon, value, companyId])

  if (!companyId) {
    return (
      <Select disabled>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Selecione uma empresa primeiro" />
        </SelectTrigger>
      </Select>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
        Não foi possível carregar os cupons: {error.message}
      </div>
    )
  }

  const availableCoupons = Array.from(couponById.values())

  return (
    <Select
      value={selectedValue}
      onValueChange={(next) => {
        const resolved = typeof next === "string" ? next : NONE_VALUE
        onChange(resolved === NONE_VALUE ? null : resolved)
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando cupons...
          </span>
        ) : (
          <SelectValue placeholder={placeholder}>
            {(current) => {
              const idValue =
                typeof current === "string" ? current : NONE_VALUE
              if (!idValue || idValue === NONE_VALUE) {
                return (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              }
              const coupon = couponById.get(idValue)
              return coupon?.code ?? placeholder
            }}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NONE_VALUE}>{placeholder}</SelectItem>
          {!availableCoupons.length && !isLoading && (
            <SelectItem value="__empty__" disabled>
              Nenhum cupom disponível
            </SelectItem>
          )}
          {availableCoupons.map((coupon) => {
            const { title, details } = formatCouponLabel(coupon)
            return (
              <SelectItem key={coupon.id} value={coupon.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{title}</span>
                  <span className="text-xs text-muted-foreground">{details}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
