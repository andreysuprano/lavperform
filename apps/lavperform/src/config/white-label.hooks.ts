/**
 * Inicialização do White Label
 *
 * Importe e chame initializeWhiteLabel() no início da sua aplicação
 * (App.tsx ou main.tsx) para configurar favicon, meta tags e CSS variables
 */

import { ReactNode, useEffect } from 'react'

import { initializeWhiteLabel, updateDocumentTitle } from './white-label.utils'

/**
 * Hook para inicializar o White Label na aplicação
 * Use no componente raiz (App.tsx)
 */
export function useWhiteLabelInit() {
  useEffect(() => {
    // Inicializa todas as configurações do White Label
    initializeWhiteLabel()
  }, [])
}

/**
 * Hook para atualizar o título da página dinamicamente
 * @param title - Título da página (será prefixado com o nome do app)
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    updateDocumentTitle(title)
  }, [title])
}

/**
 * Componente de exemplo de inicialização
 * Adicione no seu App.tsx
 */
export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  useWhiteLabelInit()

  return children
}
