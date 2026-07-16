import { lazy } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'

import { AuthLayout } from '@/components'
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'

const ClientPage = lazy(() =>
  import('@/pages/organization/ClientPage').then((module) => ({
    default: module.ClientPage,
  }))
)
const RegisterCompany = lazy(() =>
  import('@/pages/organization/RegisterCompanyPage').then((module) => ({
    default: module.RegisterCompanyPage,
  }))
)
const RedirectPage = lazy(() =>
  import('@/pages/utils/RedirectPage').then((module) => ({
    default: module.RedirectPage,
  }))
)
const RedirectWhatsAppPage = lazy(() =>
  import('@/pages/utils/RedirectWhatsAppPage').then((module) => ({
    default: module.RedirectWhatsAppPage,
  }))
)

function LayoutWrapper() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}

export function PublicRoutes() {
  return (
    <Routes>
      <Route element={<LayoutWrapper />}>
        <Route
          element={<LoginPage />}
          path="*"
        />
        <Route
          element={<LoginPage />}
          path="/login"
        />
        <Route
          element={<ForgotPasswordPage />}
          path="/forgot-password"
        />
        <Route
          element={<ChangePasswordPage />}
          path="/change-password"
        />
      </Route>
      <Route
        element={<ClientPage />}
        path="/p/:slug"
      />
      <Route
        element={<RedirectPage />}
        path="/c/:id"
      />
      <Route
        element={<RegisterCompany />}
        path="/register-company/:id"
      />
      <Route
        element={<RedirectWhatsAppPage />}
        path="/wa"
      />
    </Routes>
  )
}
