import { logger } from '@/utils/logger'

import { availableThemes } from './themes'
import { ThemeConfig } from './white-label.types'
import { getLoginLeftImage } from './white-label.utils'

/**
 * Obtém o tema atual baseado na variável de ambiente VITE_THEME_ID
 * @returns ThemeConfig - Configuração do tema ativo
 */
export const getCurrentTheme = (): ThemeConfig => {
  const themeId = import.meta.env.VITE_THEME_ID || 'default'
  const theme = availableThemes[themeId as keyof typeof availableThemes]

  if (!theme) {
    logger.warn(`Tema "${themeId}" não encontrado. Usando tema padrão.`)
    return availableThemes.default
  }

  return theme
}

/**
 * Classe singleton para gerenciar o tema da aplicação
 */
class WhiteLabelManager {
  private static instance: WhiteLabelManager
  private currentTheme: ThemeConfig

  private constructor() {
    this.currentTheme = getCurrentTheme()
  }

  public static getInstance(): WhiteLabelManager {
    if (!WhiteLabelManager.instance) {
      WhiteLabelManager.instance = new WhiteLabelManager()
    }
    return WhiteLabelManager.instance
  }

  /**
   * Retorna a configuração do tema atual
   */
  public getTheme(): ThemeConfig {
    return this.currentTheme
  }

  /**
   * Retorna as cores do tema atual
   */
  public getColors() {
    return this.currentTheme.colors
  }

  /**
   * Retorna as imagens do tema atual
   */
  public getImages() {
    return this.currentTheme.images
  }

  /**
   * Retorna os textos do tema atual
   */
  public getTexts() {
    return this.currentTheme.texts
  }

  /**
   * Retorna as fontes do tema atual
   */
  public getFonts() {
    return this.currentTheme.fonts
  }

  /**
   * Retorna uma cor específica do tema
   */
  public getColor(key: keyof ThemeConfig['colors']): string | undefined {
    return this.currentTheme.colors[key] as string | undefined
  }

  /**
   * Retorna uma imagem específica do tema
   */
  public getImage(key: keyof ThemeConfig['images']): string | undefined {
    return this.currentTheme.images[key]
  }

  /**
   * Retorna um texto específico do tema
   * Suporta notação de ponto para textos aninhados
   * @example getText('appName') ou getText('authPageLayout.heroTitle')
   */
  public getText(key: string): string | undefined {
    const keys = key.split('.')
    let value: any = this.currentTheme.texts

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return undefined
      }
    }

    return typeof value === 'string' ? value : undefined
  }
}

// Exporta a instância singleton
export const whiteLabelManager = WhiteLabelManager.getInstance()

// Exporta hooks e utilidades para React
export const useWhiteLabel = () => {
  const theme = whiteLabelManager.getTheme()

  return {
    theme,
    colorPalette: theme.colorPalette,
    colors: theme.colors,
    images: theme.images,
    texts: theme.texts,
    fonts: theme.fonts,
    features: theme.features,
    getColor: (key: keyof ThemeConfig['colors']) =>
      whiteLabelManager.getColor(key),
    getImage: (key: keyof ThemeConfig['images']) =>
      whiteLabelManager.getImage(key),
    getText: (key: string) => whiteLabelManager.getText(key),
    getLoginLeftImage,
  }
}
