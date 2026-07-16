export const convertISOToDate = (dateString?: string | null, options?: object) => {
  if (!dateString) return ''

  const dateObject = new Date(dateString).toLocaleDateString('pt-BR', {
    ...options,
  })

  return dateObject
}

export const convertISOToDateTime = (dateString: string) => {
  const now = new Date(dateString)

  const isoString = now.toISOString()

  const formattedDate = isoString.substring(0, 16)

  return formattedDate
}
