import { ADMIN_API_URL } from "@/services/constants"
import { clearStoredToken, getStoredToken } from "@/services/auth-storage"

export async function downloadAllCustomersCsv(): Promise<void> {
  const token = getStoredToken()
  const response = await fetch(`${ADMIN_API_URL}/admin/customers/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

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
  link.download = "clientes.csv"
  link.click()
  URL.revokeObjectURL(url)
}
