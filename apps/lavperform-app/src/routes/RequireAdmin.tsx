import React from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

interface RequireAdminProps {
  children: React.ReactElement
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { isAuthenticated, isAdmin } = useAuth()

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to="/login"
      />
    )
  }

  // If user is authenticated but not admin, redirect to dashboard (or 403)
  if (!isAdmin) {
    return (
      <Navigate
        replace
        to="/dashboard"
      />
    )
  }

  return children
}
