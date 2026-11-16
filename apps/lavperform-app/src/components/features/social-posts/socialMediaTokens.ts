import { useColorModeValue } from '@/components/ui/color-mode'

export function useSocialMediaTokens() {
  return {
    text: useColorModeValue('#18181B', 'gray.100'),
    muted: useColorModeValue('#71717A', 'gray.400'),
    card: useColorModeValue('white', 'gray.800'),
    border: useColorModeValue('#E4E4E7', 'whiteAlpha.300'),
    page: useColorModeValue('#F4F4F5', 'gray.900'),
    accent: '#7BC9F1',
    deep: '#093A58',
    selectedBg: useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)'),
    track: useColorModeValue('#E4E4E7', 'whiteAlpha.300'),
    input: useColorModeValue('white', 'gray.800'),
  }
}

export const STATUS_STYLE: Record<
  string,
  { bg: string; color: string }
> = {
  rascunho: { bg: '#F4F4F5', color: '#52525B' },
  gerando: { bg: '#FEF3C7', color: '#92400E' },
  gerado: { bg: '#EDE9FE', color: '#6D28D9' },
  agendado: { bg: '#DBEAFE', color: '#1D4ED8' },
  publicado: { bg: '#DCFCE7', color: '#15803D' },
  falhou: { bg: '#FEE2E2', color: '#B91C1C' },
}
