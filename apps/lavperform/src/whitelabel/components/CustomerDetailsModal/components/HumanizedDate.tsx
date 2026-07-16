import { Text, Tooltip } from '@chakra-ui/react'

interface Props {
  timestamp: string
  compact?: boolean
}

// Função helper para formatar data em português
function formatDatePtBR(date: Date, full: boolean = false): string {
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ]

  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (full) {
    return `${dayName}, ${day} de ${month} de ${year} às ${hours}:${minutes}`
  }

  return `${String(day).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${year} ${hours}:${minutes}`
}

export function HumanizedDate({ timestamp, compact = false }: Props) {
  const date = new Date(timestamp)
  const fullFormat = formatDatePtBR(date, true)
  const compactFormat = formatDatePtBR(date, false)

  if (compact) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Text
            color="gray.500"
            cursor="help"
            fontSize="xs"
          >
            {compactFormat}
          </Text>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content>
            {fullFormat}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    )
  }

  return (
    <Text
      color="gray.500"
      fontSize="xs"
    >
      {fullFormat}
    </Text>
  )
}
