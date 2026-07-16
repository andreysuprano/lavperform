export const convertDateToISO = (dateString?: string, hasHours?: boolean) => {
  if (!dateString) return

  if (!hasHours) {
    dateString = dateString + ' 00:00'
  }

  const [datePart, timePart] = dateString.split(' ')

  const [day, month, year] = datePart.split('/')

  const reformattedDate = `${year}-${month}-${day}`

  const fullDateString = `${reformattedDate}T${timePart}:00.000Z`

  const dateObject = new Date(fullDateString)

  return dateObject.toISOString()
}
