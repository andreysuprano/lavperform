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
  downloadAllCompanies,
  type CompanyExportFormat,
} from "@/features/companies/export-companies"

export function ExportCompaniesButton() {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport(format: CompanyExportFormat) {
    if (isExporting) return

    setIsExporting(true)
    try {
      await downloadAllCompanies(format)
      toast.success("Lavanderias exportadas")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar as lavanderias"
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
        {isExporting ? "Exportando..." : "Exportar lavanderias"}
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
