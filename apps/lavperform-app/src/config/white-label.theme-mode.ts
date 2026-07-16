import { useEffect, useState } from 'react'

import { useWhiteLabel } from './white-label.config'

/**
 * Hook para detectar o tema do sistema (dark mode)
 * @returns 'light' | 'dark'
 */
export function useSystemTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return theme
}

/**
 * Hook para obter a logo apropriada baseada no tema
 * @param variant - 'auto' (detecta automaticamente) | 'light' | 'dark'
 * @returns URL da logo apropriada
 */
export function useThemeLogo(variant: 'auto' | 'light' | 'dark' = 'auto') {
  const systemTheme = useSystemTheme()
  const { images } = useWhiteLabel()

  if (variant === 'auto') {
    // Se o sistema está em dark mode e existe logoDark, usa ela
    if (systemTheme === 'dark' && images.logoDark) {
      return images.logoDark
    }
    // Caso contrário, usa a logo padrão
    return images.logo
  }

  // Permite forçar uma variante específica
  if (variant === 'dark' && images.logoDark) {
    return images.logoDark
  }

  return images.logo
}
