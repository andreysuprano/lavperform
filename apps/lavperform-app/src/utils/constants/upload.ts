/**
 * Constantes de validação de upload de imagem
 */
export const MAX_FILE_SIZE = 5 // MB
export const MAX_FILE_SIZE_IN_BYTES = MAX_FILE_SIZE * 1024 * 1024

/**
 * Formatos de imagem aceitos
 */
export const ACCEPTED_IMAGE_FORMATS = 'image/*'

/**
 * Tipos MIME aceitos para imagem
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]
