import type { BrandIdentity, PostLayer } from '@/types'

export function contrastRatio(foreground: string, background: string) {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  if (!fg || !bg) return 1
  const luminance = (rgb: { r: number; g: number; b: number }) => {
    const channel = (value: number) => {
      const ratio = value / 255
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
    }
    return (
      0.2126 * channel(rgb.r) +
      0.7152 * channel(rgb.g) +
      0.0722 * channel(rgb.b)
    )
  }
  const lighter = Math.max(luminance(fg), luminance(bg))
  const darker = Math.min(luminance(fg), luminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

export function contrastMessage(primaryColor: string) {
  const ratio = contrastRatio('#FFFFFF', primaryColor)
  const rounded = (Math.round(ratio * 10) / 10).toFixed(1).replace('.', ',')
  const pass = ratio >= 4.5
  return {
    pass,
    ratio,
    label: pass
      ? `Contraste do texto branco sobre a cor Principal: ${rounded}:1 — aprovado (AA).`
      : `Contraste do texto branco sobre a cor Principal: ${rounded}:1 — abaixo de 4,5:1.`,
  }
}

export function logoSrc(
  brand: Pick<BrandIdentity, 'logoLightUrl' | 'logoDarkUrl'>,
  variant: PostLayer['logoVariant'] = 'light'
) {
  if (variant === 'dark') {
    return brand.logoDarkUrl || brand.logoLightUrl || '/seld/logo.png'
  }
  return brand.logoLightUrl || brand.logoDarkUrl || '/seld/logo.png'
}

export function readImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Envie um PNG, SVG, JPG ou WebP.'))
  }
  if (file.size > 1_500_000) {
    return Promise.reject(new Error('A imagem precisa ter no máximo 1,5 MB.'))
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}
