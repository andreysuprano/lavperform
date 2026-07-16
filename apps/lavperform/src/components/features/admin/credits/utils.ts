export const formatCreditCents = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((value || 0) / 100)

export const parseCurrencyToCents = (value: string | number) => {
  const normalized = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  return Math.round(Number(normalized || 0) * 100)
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as {
    response?: { data?: { message?: string } }
    message?: string
  }

  return err?.response?.data?.message || err?.message || fallback
}
