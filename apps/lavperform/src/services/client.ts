import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

import { EMBED_TOKEN_STORAGE_KEY } from '@/constants/embedTokenStorage'

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

// Interceptor para adicionar o token em todas as requisições
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('@FoodCRM:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function isEmbedTokenRequest(config: InternalAxiosRequestConfig | undefined) {
  const url = config?.url ?? ''
  return url.includes('/ads/embed-token')
}

// Interceptor para tratar erros de autenticação
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      !isEmbedTokenRequest(error.config)
    ) {
      localStorage.removeItem('@FoodCRM:token')
      localStorage.removeItem('@FoodCRM:user')
      localStorage.removeItem(EMBED_TOKEN_STORAGE_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { authClient, client }
