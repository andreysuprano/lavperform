"use client"

import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function AsaasIdCopy({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-2 py-0.5 text-xs">{value}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            void navigator.clipboard.writeText(value)
            toast.success("Copiado")
          }}
        >
          <CopyIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
