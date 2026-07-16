import { whiteLabelManager } from './white-label.config'

/**
 * Utilitários para trabalhar com o sistema White Label
 */

/**
 * Gera CSS inline com as cores do tema atual
 * Útil para emails HTML, PDFs, etc.
 */
export const getThemeInlineStyles = () => {
  const colors = whiteLabelManager.getColors()

  return {
    primary: { color: colors.primary },
    primaryBg: { backgroundColor: colors.primary },
  }
}

/**
 * Gera variáveis CSS personalizadas para o tema
 */
export const generateCSSVariables = () => {
  const colors = whiteLabelManager.getColors()
  const fonts = whiteLabelManager.getFonts()

  return `
    :root {
      /* Colors */
      --theme-primary: ${colors.primary};
      --theme-bg: #f5f5f6;
      
      /* Fonts */
      --theme-font-body: ${fonts?.body || '"Inter", sans-serif'};
      --theme-font-heading: ${fonts?.heading || '"Inter", sans-serif'};
      --theme-font-mono: ${fonts?.mono || '"Fira Code", monospace'};
    }
    
    .dark {
      --theme-bg: #333;
    }
    
    .dark ::-webkit-scrollbar-track {
      background: #333 !important;
    }
    
    .dark body::-webkit-scrollbar-track {
      background: #333 !important;
    }
    
    .dark .custom-scrollbar {
      scrollbar-color: ${colors.primary} #333 !important;
    }
  `
}

/**
 * Injeta as variáveis CSS no documento
 * Chamar no início da aplicação
 */
export const injectThemeCSSVariables = () => {
  const style = document.createElement('style')
  style.innerHTML = generateCSSVariables()
  document.head.appendChild(style)
}

/**
 * Atualiza o favicon dinamicamente baseado no tema
 */
export const updateFavicon = () => {
  const favicon = whiteLabelManager.getImage('favicon')
  if (favicon) {
    const link =
      document.querySelector<HTMLLinkElement>("link[rel*='icon']") ||
      document.createElement('link')
    link.type = 'image/x-icon'
    link.rel = 'shortcut icon'
    link.href = favicon
    document.head.appendChild(link)
  }
}

/**
 * Atualiza o título da página baseado no tema
 */
export const updateDocumentTitle = (suffix?: string) => {
  const appName = whiteLabelManager.getText('appName')
  document.title = suffix ? `${appName} - ${suffix}` : appName || 'App'
}

/**
 * Atualiza meta tags para SEO baseado no tema
 */
export const updateMetaTags = () => {
  const texts = whiteLabelManager.getTexts()
  const colors = whiteLabelManager.getColors()

  // Description
  const metaDescription = document.querySelector('meta[name="description"]')
  if (metaDescription) {
    metaDescription.setAttribute('content', texts.appDescription || '')
  }

  // Theme color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', colors.primary)
  }

  // Open Graph
  updateMetaTag('og:title', texts.appName)
  updateMetaTag('og:description', texts.appDescription)

  // Twitter Card
  updateMetaTag('twitter:title', texts.appName)
  updateMetaTag('twitter:description', texts.appDescription)
}

/**
 * Helper para atualizar meta tags
 */
const updateMetaTag = (property: string, content?: string) => {
  if (!content) return

  let meta = document.querySelector(`meta[property="${property}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

/**
 * Inicializa todas as configurações do tema no documento
 * Chamar no início da aplicação (App.tsx ou main.tsx)
 */
export const initializeWhiteLabel = () => {
  injectThemeCSSVariables()
  updateFavicon()
  updateDocumentTitle()
  updateMetaTags()
}

/**
 * Retorna um objeto com todas as informações do tema formatadas
 * Útil para debug ou para enviar ao backend
 */
export const getThemeSnapshot = () => {
  const theme = whiteLabelManager.getTheme()

  return {
    id: theme.id,
    name: theme.name,
    colors: theme.colors,
    images: theme.images,
    texts: theme.texts,
    fonts: theme.fonts,
    environment: import.meta.env.VITE_THEME_ID,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Obtém a imagem personalizada para a área esquerda do login
 * Prioridade: ENV (VITE_LOGIN_LEFT_IMAGE) > Tema (loginLeftImage)
 * @returns URL da imagem ou undefined se não configurada
 */
export const getLoginLeftImage = (): string | undefined => {
  // Prioridade 1: Variável de ambiente
  const envImage = import.meta.env.VITE_LOGIN_LEFT_IMAGE
  if (envImage && typeof envImage === 'string' && envImage.trim() !== '') {
    return envImage.trim()
  }

  // Prioridade 2: Configuração do tema
  const themeImage = whiteLabelManager.getImage('loginLeftImage')
  if (themeImage && typeof themeImage === 'string' && themeImage.trim() !== '') {
    return themeImage.trim()
  }

  // Nenhuma imagem configurada
  return undefined
}