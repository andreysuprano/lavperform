export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatCents(cents: number): string {
  return formatBRL(cents / 100)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value)
}

export function formatRelativeUpdatedAt(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  const diffMs = Date.now() - then

  if (Number.isNaN(then)) return "—"

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`

  const days = Math.floor(hours / 24)
  return `há ${days} dia${days === 1 ? "" : "s"}`
}
