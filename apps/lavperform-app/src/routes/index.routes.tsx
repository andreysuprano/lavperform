import { useAuth } from '@/context/AuthContext'
import { PrivateRoutes } from '@/routes/private.routes'
import { PublicRoutes } from '@/routes/public.routes'

export function Router() {
  const { isAuthenticated } = useAuth()

  return <>{isAuthenticated ? <PrivateRoutes /> : <PublicRoutes />}</>
}
