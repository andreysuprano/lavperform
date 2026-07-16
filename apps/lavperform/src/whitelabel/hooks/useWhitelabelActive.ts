import { useMemo } from 'react'
import { useWhiteLabel } from '@/config'

/**
 * Verifica se o whitelabel está ativo baseado em VITE_THEME_ID
 * Retorna true quando VITE_THEME_ID !== 'default'
 */
export function useWhitelabelActive() {
  const { theme } = useWhiteLabel()

  const isActive = useMemo(() => {
    const themeId = import.meta.env.VITE_THEME_ID || 'default'
    return themeId !== 'default'
  }, [])

  return {
    isActive,
    themeId: theme.id,
  }
}
