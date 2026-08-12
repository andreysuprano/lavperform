import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoadingState } from '@/components'
import { useWhitelabelActive } from '../hooks/useWhitelabelActive'

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
          path="/ai-agent"
          element={<AIAgentConfigPage />}
        />
        <Route
          path="/ai-agent/:agentId"
          element={<AIAgentDetailPage />}
        />
        <Route
          path="/weather"
          element={<WeatherConfigPage />}
        />
        <Route
          path="/landing-page"
          element={<LandingPageIndexPage />}
        />
        <Route
          path="/landing-page/branding"
          element={<BrandingPage />}
        />
        <Route
          path="/landing-page/hero"
          element={<HeroPage />}
        />
        <Route
          path="/landing-page/services"
          element={<ServicesPage />}
        />
        <Route
          path="/landing-page/location"
          element={<LocationPage />}
        />
        <Route
          path="/landing-page/faq"
          element={<FaqPage />}
        />
        <Route
          path="/landing-page/testimonials"
          element={<TestimonialsPage />}
        />
        <Route
          path="/landing-page/cta"
          element={<CtaPage />}
        />
        <Route
          path="/landing-page/footer"
          element={<FooterPage />}
        />
      </Routes>
    </Suspense>
  )
}
