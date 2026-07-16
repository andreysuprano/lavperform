import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Importação direta para evitar dependência circular com o barrel @/whitelabel/hooks
import {
  useHasLandingPage,
  useLandingPageConfig,
} from '@/whitelabel/hooks/queries/useLandingPage'

const LANDING_PAGE_INDEX_PATH = '/whitelabel/landing-page'
export function useRequireLandingPage() {
  const navigate = useNavigate()
  const { hasLandingPage, isLoading: isCheckingExists } = useHasLandingPage()
  const { data, isLoading: isLoadingConfig } = useLandingPageConfig()

  const isLoading = isCheckingExists || isLoadingConfig
  const canEdit = hasLandingPage && !!data

  useEffect(() => {
    if (isLoading) return
    if (!canEdit) {
      navigate(LANDING_PAGE_INDEX_PATH, { replace: true })
    }
  }, [canEdit, isLoading, navigate])

  return { canEdit, isLoading, data }
}
