import type { BrandIdentity, PostFormat, PostLayer, PostSlide } from '@/types'
import { formatAspect } from '@/types'

import { logoSrc } from './brandVisual'

export interface ExportPostInput {
  format: PostFormat | string
  slide: PostSlide
  brand: Pick<BrandIdentity, 'logoLightUrl' | 'logoDarkUrl' | 'titleFont'>
}

export function postPixelSize(format: string) {
  const aspect = formatAspect(format)
  const width = 1080
  return { width, height: Math.round(width / aspect) }
}

export function buildPostSvg({ format, slide, brand }: ExportPostInput) {
  const { width, height } = postPixelSize(format)
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#7BC9F1"/>`,
  ]
  if (slide.backgroundImage) {
    parts.push(
      `<image href="${escapeAttr(slide.backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
    )
  }
  for (const layer of slide.layers) {
    if (!layer.visible) continue
    parts.push(layerSvg(layer, width, height, brand))
  }
  parts.push('</svg>')
  return parts.join('')
}

export async function exportPostBlob(input: ExportPostInput) {
  try {
    const blob = await renderPng(input)
    if (blob && blob.size > 32) return { blob, extension: 'png' as const }
  } catch {
    // O navegador de teste não tem canvas; o SVG leva as mesmas camadas.
  }
  const svg = buildPostSvg(input)
  return {
    blob: new Blob([svg], { type: 'image/svg+xml' }),
    extension: 'svg' as const,
  }
}

export async function downloadPostImage(
  input: ExportPostInput,
  filename: string
) {
  const { blob, extension } = await exportPostBlob(input)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.${extension}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function layerSvg(
  layer: PostLayer,
  width: number,
  height: number,
  brand: ExportPostInput['brand']
) {
  if (layer.type === 'background') return ''
  if (layer.type === 'color-band') {
    const x = ((layer.x ?? 0) / 100) * width
    const y = ((layer.y ?? 0) / 100) * height
    const boxWidth = ((layer.width ?? 100) / 100) * width
    const boxHeight = ((layer.height ?? 40) / 100) * height
    const opacity = layer.opacity ?? 0.7
    return `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="${escapeAttr(layer.color || '#093A58')}" opacity="${opacity}"/>`
  }
  const centerX = ((layer.x ?? 50) / 100) * width
  const centerY = ((layer.y ?? 50) / 100) * height
  if (layer.type === 'logo') {
    const box = ((layer.width ?? 28) / 100) * width
    const href = logoSrc(brand, layer.logoVariant)
    return `<image href="${escapeAttr(href)}" x="${centerX - box / 2}" y="${centerY}" width="${box}" height="${box * 0.45}" preserveAspectRatio="xMidYMid meet"/>`
  }
  const fontSize = layer.fontSize ?? (layer.type === 'badge' ? 18 : 46)
  const font = layer.fontFamily || brand.titleFont || 'Poppins'
  const text = escapeText(layer.text || '')
  if (layer.type === 'badge') {
    const boxWidth = Math.max(160, text.length * fontSize * 0.62)
    return `<g><rect x="${centerX - boxWidth / 2}" y="${centerY - fontSize}" width="${boxWidth}" height="${fontSize * 2.1}" rx="18" fill="${escapeAttr(layer.backgroundColor || '#FFD23F')}"/><text x="${centerX}" y="${centerY + fontSize * 0.15}" text-anchor="middle" font-family="${escapeAttr(font)}" font-size="${fontSize}" font-weight="700" fill="${escapeAttr(layer.color || '#093A58')}">${text}</text></g>`
  }
  return `<text x="${centerX}" y="${centerY}" text-anchor="middle" font-family="${escapeAttr(font)}" font-size="${fontSize}" font-weight="800" fill="${escapeAttr(layer.color || '#FFFFFF')}">${text}</text>`
}

async function renderPng(input: ExportPostInput) {
  const { width, height } = postPixelSize(input.format)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context || typeof context.fillText !== 'function') {
    throw new Error('canvas indisponível')
  }
  context.fillStyle = '#7BC9F1'
  context.fillRect(0, 0, width, height)
  if (input.slide.backgroundImage) {
    const image = await loadImage(input.slide.backgroundImage)
    context.drawImage(image, 0, 0, width, height)
  }
  for (const layer of input.slide.layers) {
    if (!layer.visible || layer.type === 'background') continue
    if (layer.type === 'color-band') {
      context.globalAlpha = layer.opacity ?? 0.7
      context.fillStyle = layer.color || '#093A58'
      context.fillRect(
        ((layer.x ?? 0) / 100) * width,
        ((layer.y ?? 0) / 100) * height,
        ((layer.width ?? 100) / 100) * width,
        ((layer.height ?? 40) / 100) * height
      )
      context.globalAlpha = 1
      continue
    }
    const centerX = ((layer.x ?? 50) / 100) * width
    const centerY = ((layer.y ?? 50) / 100) * height
    if (layer.type === 'logo') {
      const box = ((layer.width ?? 28) / 100) * width
      const image = await loadImage(logoSrc(input.brand, layer.logoVariant))
      context.drawImage(image, centerX - box / 2, centerY, box, box * 0.45)
      continue
    }
    const fontSize = layer.fontSize ?? 46
    context.fillStyle = layer.color || '#FFFFFF'
    context.font = `800 ${fontSize}px ${layer.fontFamily || input.brand.titleFont || 'Poppins'}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    if (layer.type === 'badge') {
      const label = layer.text || ''
      const boxWidth = Math.max(160, label.length * fontSize * 0.62)
      context.fillStyle = layer.backgroundColor || '#FFD23F'
      roundRect(
        context,
        centerX - boxWidth / 2,
        centerY - fontSize,
        boxWidth,
        fontSize * 2.1,
        18
      )
      context.fillStyle = layer.color || '#093A58'
      context.font = `700 ${fontSize}px ${layer.fontFamily || 'Poppins'}`
    }
    wrapText(
      context,
      layer.text || '',
      centerX,
      centerY,
      width * 0.84,
      fontSize * 1.05
    )
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (!blob) throw new Error('PNG vazio')
  return blob
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  const start = y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, index) => {
    context.fillText(line, x, start + index * lineHeight)
  })
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.fill()
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('imagem'))
    image.src = src
  })
}

function escapeText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string) {
  return escapeText(value).replace(/"/g, '&quot;')
}
