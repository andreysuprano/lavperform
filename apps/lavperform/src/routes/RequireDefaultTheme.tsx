import React from 'react'
import { Navigate } from 'react-router-dom'

import { useWhitelabelActive } from '@/whitelabel/hooks'

interface RequireDefaultThemeProps {
  children: React.ReactElement
}

/** Rotas visíveis apenas quando VITE_THEME_ID === 'default' */
export function RequireDefaultTheme({ children }: RequireDefaultThemeProps) {
  const { isActive: isWhitelabelActive } = useWhitelabelActive()

  if (isWhitelabelActive) {
    return (
      <Navigate
        replace
        to="/dashboard"
      />
    )
  }

  return children
}
