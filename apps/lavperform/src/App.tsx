import './styles/globalStyles.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

import { ChatwootWidget, Provider, Toaster } from '@/components'
import { useWhiteLabelInit } from '@/config'
import { AuthProvider } from '@/context/AuthContext'
import { CustomerSummaryProvider } from '@/context/CustomerSummaryContext'
import { queryClient } from '@/lib/react-query'
import { Router } from '@/routes/index.routes'
import { preloadOnIdle } from '@/utils/preload'

export function App() {
  useWhiteLabelInit()

  // Preload de chunks críticos quando o app inicializa
  useEffect(() => {
    preloadOnIdle()
  }, [])

  useEffect(() => {
    // Registra o Service Worker
    registerSW({
      onNeedRefresh() {
        // Lógica para mostrar uma notificação de atualização disponível
        console.log('Uma nova versão do app está disponível!')
        // Você pode mostrar um banner ou modal aqui
      },
      onRegistered(r) {
        if (r) {
          console.log('Service Worker registrado!')
        } else {
          console.log('Service Worker não registrado.')
        }
      },
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <BrowserRouter>
          <AuthProvider>
            <CustomerSummaryProvider>
              <Toaster />
              <ChatwootWidget />
              <Router />
            </CustomerSummaryProvider>
          </AuthProvider>
        </BrowserRouter>
      </Provider>
      {/* DevTools apenas em desenvolvimento */}
      {import.meta.env.VITE_ENVIROMENT === 'development' &&
        import.meta.env.VITE_USE_TANSTACK_LOGGER === 'true' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
    </QueryClientProvider>
  )
}
