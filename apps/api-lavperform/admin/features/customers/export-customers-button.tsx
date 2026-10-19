"use client"

import { useState } from "react"
import { DownloadIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { downloadAllCustomersCsv } from "@/features/customers/export-customers"

export function ExportCustomersButton() {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    if (isExporting) return

    setIsExporting(true)
    try {
      await downloadAllCustomersCsv()
      toast.success("Base de clientes exportada")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar os clientes"
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button variant="outline" disabled={isExporting} onClick={handleExport}>
      {isExporting ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
      {isExporting ? "Exportando..." : "Exportar clientes"}
    </Button>
  )
}
