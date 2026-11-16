import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.foodcrm.com.br',
  headers: {
    'Content-Type': 'application/json',
  },
})

const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.foodcrm.com.br',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Empresa selecionada nesta aba. Fica em memória (não no localStorage) porque
// cada aba pode estar em uma empresa diferente.
let activeCompanyId: string | null = null

export function setActiveCompanyId(companyId: string | null) {
  activeCompanyId = companyId
}

// Interceptor para adicionar o token em todas as requisições
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('@FoodCRM:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // A API usa este header para recusar alterações num agente de outra empresa.
  if (activeCompanyId) {
    config.headers['X-Company-Id'] = activeCompanyId
  }
  return config
})

// Interceptor para tratar erros de autenticação
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@FoodCRM:token')
      localStorage.removeItem('@FoodCRM:user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { authClient, client }
