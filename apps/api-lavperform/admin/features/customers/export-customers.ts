import { ADMIN_API_URL } from "@/services/constants"
import { clearStoredToken, getStoredToken } from "@/services/auth-storage"

export type CustomerExportFormat = "csv" | "xlsx"

export async function downloadAllCustomers(
  format: CustomerExportFormat
): Promise<void> {
  const token = getStoredToken()
  const response = await fetch(
    `${ADMIN_API_URL}/admin/customers/export?format=${format === "xlsx" ? "xls" : "csv"}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  )

  if (response.status === 401) {
    clearStoredToken()
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
    throw new Error("Sessão expirada")
  }

  if (!response.ok) {
    throw new Error("Não foi possível exportar os clientes")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = format === "xlsx" ? "clientes.xlsx" : "clientes.csv"
  link.click()
  URL.revokeObjectURL(url)
}
