"use client"

import { useState } from "react"
import { DownloadIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  downloadAllCustomers,
  type CustomerExportFormat,
} from "@/features/customers/export-customers"

export function ExportCustomersButton() {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport(format: CustomerExportFormat) {
    if (isExporting) return

    setIsExporting(true)
    try {
      await downloadAllCustomers(format)
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={isExporting} />
        }
      >
        {isExporting ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
        {isExporting ? "Exportando..." : "Exportar clientes"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          XLS
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
