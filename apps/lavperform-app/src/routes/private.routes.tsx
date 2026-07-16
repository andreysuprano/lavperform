import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { AppLayout, LoadingState } from '@/components'
import { DetailClientsPage } from '@/pages/customers/DetailClientsPage'
import { RfvAttributionWindowPage } from '@/pages/customers/RfvAttributionWindowPage'
import { RequireAdmin } from '@/routes/RequireAdmin'
import { RequireDefaultTheme } from '@/routes/RequireDefaultTheme'
import { WhitelabelRoutes } from '@/whitelabel/routes/whitelabel.routes'

// Lazy loading das páginas
const Home = lazy(() =>
  import('@/pages/dashboard/DashboardPage/').then((module) => ({
    default: module.Home,
  }))
)
const CustomersPage = lazy(() =>
  import('@/pages/customers/CustomersPage').then((module) => ({
    default: module.CustomersPage,
  }))
)
const BaseDeClientesPage = lazy(() =>
  import('@/pages/customers/BaseDeClientesPage').then((module) => ({
    default: module.BaseDeClientesPage,
  }))
)
const CampaignIndexPage = lazy(() =>
  import('@/pages/campaign/CampaignIndexPage').then((module) => ({
    default: module.CampaignIndexPage,
  }))
)
const RecurringCampaignPage = lazy(() =>
  import('@/pages/campaign/RecurringCampaignPage').then((module) => ({
    default: module.RecurringCampaignPage,
  }))
)
const ScheduledDispatchesPage = lazy(() =>
  import('@/pages/campaign/ScheduledDispatchesPage').then((module) => ({
    default: module.ScheduledDispatchesPage,
  }))
)
const CreativesPage = lazy(() =>
  import('@/pages/campaign/CreativesPage').then((module) => ({
    default: module.CreativesPage,
  }))
)
const CouponsPage = lazy(() =>
  import('@/pages/campaign/CouponsPage').then((module) => ({
    default: module.CouponsPage,
  }))
)
const AttributionWindowPage = lazy(() =>
  import('@/pages/campaign/AttributionWindowPage').then((module) => ({
    default: module.AttributionWindowPage,
  }))
)
const ClientPage = lazy(() =>
  import('@/pages/organization/ClientPage').then((module) => ({
    default: module.ClientPage,
  }))
)
const MyPage = lazy(() =>
  import('@/pages/organization/MyPage').then((module) => ({
    default: module.MyPage,
  }))
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  }))
)
const BillingPage = lazy(() =>
  import('@/pages/settings/BillingPage').then((module) => ({
    default: module.BillingPage,
  }))
)
const WalletPage = lazy(() =>
  import('@/pages/settings/WalletPage').then((module) => ({
    default: module.WalletPage,
  }))
)
const IntegrationPage = lazy(() =>
  import('@/pages/settings/IntegrationPage').then((module) => ({
    default: module.IntegrationPage,
  }))
)
const AdminIndexPage = lazy(() =>
  import('@/pages/admin/AdminIndexPage').then((module) => ({
    default: module.AdminIndexPage,
  }))
)
const AdminCompanyPage = lazy(() =>
  import('@/pages/admin/AdminCompanyPage').then((module) => ({
    default: module.AdminCompanyPage,
  }))
)
const AdminCreditsPage = lazy(() =>
  import('@/pages/admin/AdminCreditsPage').then((module) => ({
    default: module.AdminCreditsPage,
  }))
)
const AdminDefaultProductsPage = lazy(() =>
  import('@/pages/admin/AdminDefaultProductsPage').then((module) => ({
    default: module.AdminDefaultProductsPage,
  }))
)
const AdminCoursePage = lazy(() =>
  import('@/pages/admin/AdminCoursePage').then((module) => ({
    default: module.AdminCoursePage,
  }))
)
const AdminCarrouselPage = lazy(() =>
  import('@/pages/admin/AdminCarrouselPage').then((module) => ({
    default: module.AdminCarrouselPage,
  }))
)
const AdminWeekEventsPage = lazy(() =>
  import('@/pages/admin/AdminWeekEventsPage').then((module) => ({
    default: module.AdminWeekEventsPage,
  }))
)
const AdminPartnerPage = lazy(() =>
  import('@/pages/admin/partners').then((module) => ({
    default: module.AdminPartnerPage,
  }))
)
const AcademyIndexPage = lazy(() =>
  import('@/pages/academy/AcademyIndexPage').then((module) => ({
    default: module.AcademyIndexPage,
  }))
)
const AcademyCoursePage = lazy(() =>
  import('@/pages/academy/AcademyCoursePage').then((module) => ({
    default: module.AcademyCoursePage,
  }))
)
const AcademyLessonPage = lazy(() =>
  import('@/pages/academy/AcademyLessonPage').then((module) => ({
    default: module.AcademyLessonPage,
  }))
)
const ChannelsPage = lazy(() =>
  import('@/pages/channels/ChannelsPage').then((module) => ({
    default: module.ChannelsPage,
  }))
)
const WhatsAppBusinessAPIPage = lazy(() =>
  import('@/pages/channels/WhatsAppBusinessAPIPage').then((module) => ({
    default: module.WhatsAppBusinessAPIPage,
  }))
)
const FoodAdsIndexPage = lazy(() =>
  import('@/pages/foodads/FoodAdsIndexPage').then((module) => ({
    default: module.FoodAdsIndexPage,
  }))
)
const FoodAdsOverviewPage = lazy(() =>
  import('@/pages/foodads/FoodAdsOverviewPage').then((module) => ({
    default: module.FoodAdsOverviewPage,
  }))
)
const FoodAdsCampaignsPage = lazy(() =>
  import('@/pages/foodads/FoodAdsCampaignsPage').then((module) => ({
    default: module.FoodAdsCampaignsPage,
  }))
)

function LayoutWrapper() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <AppLayout>
      <Suspense fallback={<LoadingState />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}

export function PrivateRoutes() {
  return (
    <Routes>
      <Route element={<LayoutWrapper />}>
        <Route
          element={
            <Navigate
              replace
              to="/dashboard"
            />
          }
          path="/"
        />
        <Route
          element={<Home />}
          path="/dashboard"
        />
        <Route
          element={<CustomersPage />}
          path="/customers"
        />
        <Route
          element={<BaseDeClientesPage />}
          path="/customers/CustomerBase"
        />
        <Route
          element={<DetailClientsPage />}
          path="/customers/ClientDetails"
        />
        <Route
          element={<RfvAttributionWindowPage />}
          path="/customers/rfv-attribution"
        />
        <Route
          element={<CampaignIndexPage />}
          path="/campaigns"
        />
        <Route
          element={<RecurringCampaignPage />}
          path="/campaigns/recurring-campaigns"
        />
        <Route
          element={<CreativesPage />}
          path="/campaigns/templates"
        />
        <Route
          element={<Navigate replace to="/campaigns/templates" />}
          path="/campaigns/creatives"
        />
        <Route
          element={<ScheduledDispatchesPage />}
          path="/campaigns/scheduled-dispatches"
        />
        <Route
          element={<CouponsPage />}
          path="/campaigns/coupons"
        />
        <Route
          element={<AttributionWindowPage />}
          path="/campaigns/attribution-window"
        />
        <Route
          element={<AttributionWindowPage />}
          path="/settings/attribution-window"
        />
        <Route
          element={<RfvAttributionWindowPage />}
          path="/settings/rfv-attribution"
        />

        <Route
          element={<IntegrationPage />}
          path="/integrations"
        />
        <Route
          element={<ChannelsPage />}
          path="/channels"
        />
        <Route
          element={<WhatsAppBusinessAPIPage />}
          path="/channels/whatsapp-business-api"
        />
        <Route
          element={
            <RequireDefaultTheme>
              <FoodAdsIndexPage />
            </RequireDefaultTheme>
          }
          path="/foodads"
        />
        <Route
          element={
            <RequireDefaultTheme>
              <FoodAdsOverviewPage />
            </RequireDefaultTheme>
          }
          path="/foodads/overview"
        />
        <Route
          element={
            <RequireDefaultTheme>
              <FoodAdsCampaignsPage />
            </RequireDefaultTheme>
          }
          path="/foodads/campaigns"
        />
        <Route
          element={<AcademyIndexPage />}
          path="/academy"
        />
        <Route
          element={<AcademyCoursePage />}
          path="/academy/:courseId"
        />
        <Route
          element={<AcademyLessonPage />}
          path="/academy/:courseId/lesson/:lessonId"
        />
        <Route
          element={<SettingsPage />}
          path="/settings"
        />
        <Route
          element={<BillingPage />}
          path="/billing"
        />
        <Route
          element={<WalletPage />}
          path="/settings/wallet"
        />
        <Route
          element={<MyPage />}
          path="/my-page"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminIndexPage />
            </RequireAdmin>
          }
          path="/admin"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminCompanyPage />
            </RequireAdmin>
          }
          path="/admin/companies"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminCreditsPage />
            </RequireAdmin>
          }
          path="/admin/credits"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminDefaultProductsPage />
            </RequireAdmin>
          }
          path="/admin/credits/default-products"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminCoursePage />
            </RequireAdmin>
          }
          path="/admin/courses"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminCarrouselPage />
            </RequireAdmin>
          }
          path="/admin/carrousel"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminWeekEventsPage />
            </RequireAdmin>
          }
          path="/admin/week-events"
        />
        <Route
          element={
            <RequireAdmin>
              <AdminPartnerPage />
            </RequireAdmin>
          }
          path="/admin/partners"
        />
        {/* Rotas whitelabel (só aparecem se whitelabel ativo) */}
        <Route
          element={<WhitelabelRoutes />}
          path="/whitelabel/*"
        />
      </Route>
      <Route
        element={<ClientPage />}
        path="/p/:slug"
      />
    </Routes>
  )
}
