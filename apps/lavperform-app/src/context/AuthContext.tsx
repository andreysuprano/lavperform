import { jwtDecode } from 'jwt-decode'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { adsService, applicationService, authService } from '@/services'
import type { AuthArgs, User, UserCompany } from '@/types'
import { mapPreloadCompaniesToUserCompanies } from '@/utils/preloadCompanies'

interface AuthContextData {
  user: User | null
  companies: UserCompany[]
  selectedCompany: UserCompany | null
  isAuthenticated: boolean
  isAdmin: boolean
  isPreloadLoading: boolean
  signIn: (args: AuthArgs) => Promise<void>
  signOut: () => void
  selectCompany: (companyId: string) => void
  updateCompanyAvatar: (companyId: string, avatarUrl: string) => void
  updateCompanyFlags: (
    companyId: string,
    flags: Partial<
      Pick<UserCompany, 'showTodayPurchases' | 'showIncentivizedSales'>
    >
  ) => void
}

const AuthContext = createContext({} as AuthContextData)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [companies, setCompanies] = useState<UserCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<UserCompany | null>(
    null
  )
  const [isPreloadLoading, setIsPreloadLoading] = useState(false)

  // isAdmin is computed from the user's email domain compared to Vite env
  const isAdminFromUser = (user: User | null) => {
    if (!user || !user.userEmail) return false
    try {
      const envDomainRaw = (import.meta.env.VITE_ADM_DOMAIN as string) || ''
      const envDomain = envDomainRaw.replace(/^@/, '').toLowerCase()
      const parts = user.userEmail.split('@')
      if (parts.length < 2) return false
      const userDomain = parts[1].toLowerCase()
      return userDomain === envDomain
    } catch {
      return false
    }
  }

  const applyPreloadCompanies = useCallback(
    (userCompanies: UserCompany[]): UserCompany | null => {
      setCompanies(userCompanies)
      if (userCompanies.length === 0) {
        setSelectedCompany(null)
        adsService.clearStoredEmbedToken()
        return null
      }
      const lastSelectedCompanyId = localStorage.getItem(
        '@FoodCRM:lastSelectedCompanyId'
      )
      const lastCompany = lastSelectedCompanyId
        ? userCompanies.find((c) => c.id === lastSelectedCompanyId)
        : null
      const companyToSelect = lastCompany ?? userCompanies[0]
      setSelectedCompany(companyToSelect)
      localStorage.setItem('@FoodCRM:lastSelectedCompanyId', companyToSelect.id)
      return companyToSelect
    },
    []
  )

  useEffect(() => {
    if (!isAuthenticated()) {
      return
    }
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }
    setIsPreloadLoading(true)
    applicationService
      .getPreload()
      .then((res) => {
        const userCompanies = mapPreloadCompaniesToUserCompanies(
          res.data.companies ?? []
        )
        const company = applyPreloadCompanies(userCompanies)
        if (company) {
          void adsService.syncEmbedToken(company.id)
        }
      })
      .catch(() => {
        setCompanies([])
        setSelectedCompany(null)
        adsService.clearStoredEmbedToken()
      })
      .finally(() => {
        setIsPreloadLoading(false)
      })
  }, [applyPreloadCompanies])

  function selectCompany(companyId: string) {
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      setSelectedCompany(company)
      // Armazena o ID da empresa selecionada no localStorage
      localStorage.setItem('@FoodCRM:lastSelectedCompanyId', companyId)
      void adsService.syncEmbedToken(companyId)
      // Removido o reload para evitar re-renderização completa do Layout
      // Os componentes que dependem da empresa selecionada devem usar selectedCompany do contexto
      // e invalidar suas queries do React Query quando necessário
      // window.location.reload()
    }
  }

  function updateCompanyAvatar(companyId: string, avatarUrl: string) {
    const updatedCompanies = companies.map((c) =>
      c.id === companyId ? { ...c, avatarUrl } : c
    )
    setCompanies(updatedCompanies)

    if (selectedCompany?.id === companyId) {
      setSelectedCompany({ ...selectedCompany, avatarUrl })
    }

    if (user) {
      const updatedUser = {
        ...user,
        companyAvatar:
          selectedCompany?.id === companyId ? avatarUrl : user.companyAvatar,
      }
      setUser(updatedUser)
      localStorage.setItem('@FoodCRM:user', JSON.stringify(updatedUser))
    }
  }

  function updateCompanyFlags(
    companyId: string,
    flags: Partial<
      Pick<UserCompany, 'showTodayPurchases' | 'showIncentivizedSales'>
    >
  ) {
    const updatedCompanies = companies.map((c) =>
      c.id === companyId ? { ...c, ...flags } : c
    )
    setCompanies(updatedCompanies)

    if (selectedCompany?.id === companyId) {
      setSelectedCompany({ ...selectedCompany, ...flags })
    }
  }

  function getStoredUser(): User | null {
    const storedUser = localStorage.getItem('@FoodCRM:user')
    if (storedUser) {
      return JSON.parse(storedUser)
    }
    return null
  }

  function isAuthenticated(): boolean {
    const token = localStorage.getItem('@FoodCRM:token')
    if (!token) return false

    try {
      const decoded = jwtDecode<User>(token)
      const currentTime = Date.now() / 1000

      // Verifica se o token não expirou
      return decoded.exp > currentTime
    } catch {
      return false
    }
  }

  async function signIn({ email, password }: AuthArgs) {
    const response = await authService.login({ email, password })
    const { access_token } = response.data

    const userData = jwtDecode<User>(access_token)
    const userToStore = { ...userData, companies: [] as UserCompany[] }
    localStorage.setItem('@FoodCRM:token', access_token)
    localStorage.setItem('@FoodCRM:user', JSON.stringify(userToStore))
    setUser(userToStore)

    const preloadRes = await applicationService.getPreload()
    const userCompanies = mapPreloadCompaniesToUserCompanies(
      preloadRes.data.companies ?? []
    )
    const company = applyPreloadCompanies(userCompanies)
    if (company) {
      void adsService.syncEmbedToken(company.id)
    }

    window.location.href = '/'
  }

  function signOut() {
    localStorage.removeItem('@FoodCRM:token')
    localStorage.removeItem('@FoodCRM:user')
    localStorage.removeItem('@FoodCRM:lastSelectedCompanyId')
    adsService.clearStoredEmbedToken()
    setUser(null)
    setCompanies([])
    setSelectedCompany(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        companies,
        selectedCompany,
        isAuthenticated: !!user,
        isAdmin: isAdminFromUser(user),
        isPreloadLoading,
        signIn,
        signOut,
        selectCompany,
        updateCompanyAvatar,
        updateCompanyFlags,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
