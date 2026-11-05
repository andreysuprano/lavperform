import { lazy, type ReactNode,Suspense } from 'react'
import { Navigate, Route,Routes } from 'react-router-dom'

import { LoadingState } from '@/components'
import { LandingSectionTabs } from '@/components/layout/AppLayout/LandingSectionTabs'

import { useWhitelabelActive } from '../hooks/useWhitelabelActive'

function LandingFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <LandingSectionTabs />
      {children}
    </>
  )
}

const AIAgentConfigPage = lazy(() =>
  import('../pages/AIAgentConfigPage').then((module) => ({
    default: module.AIAgentConfigPage,
  }))
)

const AIAgentDetailPage = lazy(() =>
  import('../pages/AIAgentDetailPage').then((module) => ({
    default: module.AIAgentDetailPage,
  }))
)

const AIAgentConfiguratorPage = lazy(() =>
  import('../pages/AIAgentConfiguratorPage').then((module) => ({
    default: module.AIAgentConfiguratorPage,
  }))
)

const AIAgentPlaygroundPage = lazy(() =>
  import('../pages/AIAgentPlaygroundPage').then((module) => ({
    default: module.AIAgentPlaygroundPage,
  }))
)

const LandingPageIndexPage = lazy(() =>
  import('../pages/LandingPageIndexPage').then((module) => ({
    default: module.LandingPageIndexPage,
  }))
)

const BrandingPage = lazy(() =>
  import('../pages/LandingPageConfigPage/BrandingPage').then((module) => ({
    default: module.BrandingPage,
  }))
)

const HeroPage = lazy(() =>
  import('../pages/LandingPageConfigPage/HeroPage').then((module) => ({
    default: module.HeroPage,
  }))
)

const ServicesPage = lazy(() =>
  import('../pages/LandingPageConfigPage/ServicesPage').then((module) => ({
    default: module.ServicesPage,
  }))
)

const LocationPage = lazy(() =>
  import('../pages/LandingPageConfigPage/LocationPage').then((module) => ({
    default: module.LocationPage,
  }))
)

const FaqPage = lazy(() =>
  import('../pages/LandingPageConfigPage/FaqPage').then((module) => ({
    default: module.FaqPage,
  }))
)

const TestimonialsPage = lazy(() =>
  import('../pages/LandingPageConfigPage/TestimonialsPage').then((module) => ({
    default: module.TestimonialsPage,
  }))
)

const CtaPage = lazy(() =>
  import('../pages/LandingPageConfigPage/CtaPage').then((module) => ({
    default: module.CtaPage,
  }))
)

const FooterPage = lazy(() =>
  import('../pages/LandingPageConfigPage/FooterPage').then((module) => ({
    default: module.FooterPage,
  }))
)

const WeatherConfigPage = lazy(() =>
  import('../pages/WeatherConfigPage').then((module) => ({
    default: module.WeatherConfigPage,
  }))
)

export function WhitelabelRoutes() {
  const { isActive } = useWhitelabelActive()

  // Não renderiza rotas se whitelabel não estiver ativo
  if (!isActive) {
    return null
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route
          element={<AIAgentConfigPage />}
          path="/ai-agent"
        />
        <Route
          element={<Navigate replace state={{ openWizard: true }} to="/whitelabel/ai-agent" />}
          path="/ai-agent/novo"
        />
        <Route
          element={<AIAgentConfiguratorPage />}
          path="/ai-agent/:agentId/conversa"
        />
        <Route
          element={<AIAgentPlaygroundPage />}
          path="/ai-agent/:agentId/teste"
        />
        <Route
          element={<AIAgentDetailPage />}
          path="/ai-agent/:agentId"
        />
        <Route
          element={<WeatherConfigPage />}
          path="/weather"
        />
        <Route
          element={<LandingPageIndexPage />}
          path="/landing-page"
        />
        <Route
          element={<LandingFrame><BrandingPage /></LandingFrame>}
          path="/landing-page/branding"
        />
        <Route
          element={<LandingFrame><HeroPage /></LandingFrame>}
          path="/landing-page/hero"
        />
        <Route
          element={<LandingFrame><ServicesPage /></LandingFrame>}
          path="/landing-page/services"
        />
        <Route
          element={<LandingFrame><LocationPage /></LandingFrame>}
          path="/landing-page/location"
        />
        <Route
          element={<LandingFrame><FaqPage /></LandingFrame>}
          path="/landing-page/faq"
        />
        <Route
          element={<LandingFrame><TestimonialsPage /></LandingFrame>}
          path="/landing-page/testimonials"
        />
        <Route
          element={<LandingFrame><CtaPage /></LandingFrame>}
          path="/landing-page/cta"
        />
        <Route
          element={<LandingFrame><FooterPage /></LandingFrame>}
          path="/landing-page/footer"
        />
      </Routes>
    </Suspense>
  )
}
