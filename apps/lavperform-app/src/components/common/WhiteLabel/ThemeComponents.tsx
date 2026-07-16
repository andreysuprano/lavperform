import { Image, ImageProps } from '@chakra-ui/react'
import { useTheme } from 'next-themes'
import { createElement, ElementType } from 'react'

import { useWhiteLabel } from '@/config'

interface ThemeImageProps extends Omit<ImageProps, 'src'> {
  imageKey: string
  fallback?: string
  /**
   * Controla qual variante da imagem usar
   * - 'auto': Detecta automaticamente baseado no tema do sistema
   * - 'light': Força usar a versão light
   * - 'dark': Força usar a versão dark (se disponível)
   */
  variant?: 'auto' | 'light' | 'dark'
}

/**
 * Componente para renderizar imagens baseadas no tema atual
 * Suporta detecção automática de dark mode para logos
 * Usa o componente Image do Chakra UI
 *
 * @param imageKey - Chave da imagem no tema (ex: 'logo', 'logoIcon')
 * @param fallback - URL de fallback caso a imagem não exista
 * @param variant - 'auto' (padrão) | 'light' | 'dark'
 *
 * @example
 * // Logo que se adapta ao tema do sistema
 * <ThemeImage imageKey="logo" variant="auto" />
 *
 * // Sempre usa a versão light
 * <ThemeImage imageKey="logo" variant="light" />
 *
 * // Sempre usa a versão dark (se disponível)
 * <ThemeImage imageKey="logo" variant="dark" />
 *
 * // Com props do Chakra UI
 * <ThemeImage imageKey="logo" boxSize="100px" objectFit="cover" />
 */
export const ThemeImage: React.FC<ThemeImageProps> = ({
  imageKey,
  fallback = '/fallback.jpg',
  variant = 'auto',
  alt,
  ...props
}) => {
  const { getImage } = useWhiteLabel()
  const { theme } = useTheme()

  // Lógica especial para logos com suporte a dark mode
  const getImageSrc = () => {
    if (imageKey === 'logo') {
      if (variant === 'auto') {
        // Se a aplicação está em dark mode e existe logoDark, usa ela
        if (theme === 'dark') {
          const darkLogo = getImage('logoDark')
          if (darkLogo) return darkLogo
        }
        // Caso contrário, usa a logo padrão
        return getImage('logo') || fallback
      }

      // Se forçou dark e existe logoDark
      if (variant === 'dark') {
        return getImage('logoDark') || getImage('logo') || fallback
      }

      // Se forçou light, sempre usa logo padrão
      if (variant === 'light') {
        return getImage('logo') || fallback
      }
    }

    // Comportamento padrão para outras imagens
    return getImage(imageKey as any) || fallback
  }

  const imageSrc = getImageSrc()

  return (
    <Image
      alt={alt || imageKey}
      src={imageSrc}
      {...props}
    />
  )
}

interface ThemeTextProps {
  textKey: string
  fallback?: string
  as?: ElementType
  className?: string
}

/**
 * Componente para renderizar textos baseados no tema atual
 * @param textKey - Chave do texto no tema (ex: 'appName', 'tagline')
 * @param fallback - Texto de fallback caso não exista
 * @param as - Elemento HTML a ser renderizado
 */
export const ThemeText: React.FC<ThemeTextProps> = ({
  textKey,
  fallback = '',
  as = 'span',
  className,
}) => {
  const { getText } = useWhiteLabel()
  const text = getText(textKey as any) || fallback

  return createElement(as, { className }, text)
}
