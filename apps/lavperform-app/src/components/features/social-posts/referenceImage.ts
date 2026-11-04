const MAX_BYTES = 10 * 1024 * 1024
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function referenceFileError(file: File): string | null {
  if (!TYPES.has(file.type)) return 'Envie JPG, PNG ou WEBP.'
  if (file.size > MAX_BYTES) return 'Cada imagem pode ter no máximo 10 MB.'
  return null
}

export async function prepareReferenceImage(
  file: File,
  onProgress?: (value: number) => void,
): Promise<string> {
  const invalid = referenceFileError(file)
  if (invalid) throw new Error(invalid)
  onProgress?.(15)
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) {
    throw new Error('Não conseguimos ler esta imagem. Tente outra.')
  }
  const max = 1536
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Não conseguimos ler esta imagem. Tente outra.')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  onProgress?.(70)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.85)
  })
  if (!blob) throw new Error('Não conseguimos ler esta imagem. Tente outra.')
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(new Error('Não conseguimos ler esta imagem. Tente outra.'))
    reader.readAsDataURL(blob)
  })
  onProgress?.(100)
  return dataUrl
}
