/**
 * Extrai o ID do vídeo do YouTube de uma URL
 * Suporta formatos: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/embed/xxx
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

/**
 * Converte uma URL do YouTube para formato embed
 */
export const getYouTubeEmbedUrl = (url: string): string | null => {
  const videoId = extractYouTubeVideoId(url)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

/**
 * Verifica se uma URL é do YouTube
 */
export const isYouTubeUrl = (url: string): boolean => {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url)
}

/**
 * Gera URL da thumbnail do YouTube
 */
export const getYouTubeThumbnail = (
  url: string,
  quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'
): string | null => {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return null

  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  }

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}
