import { toaster } from '@/components'
import { toBase64, uploadFileWithBase64 } from '@/firebase/storage'
import { MAX_FILE_SIZE, MAX_FILE_SIZE_IN_BYTES } from '@/utils/constants/upload'

export interface UploadImageOptions {
  file: File
  folder: string
}

export interface UploadImageResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Valida e faz upload de uma imagem
 * @param options - Opções de upload (arquivo e pasta)
 * @returns Resultado do upload com URL ou erro
 */
export async function uploadImage({
  file,
  folder,
}: UploadImageOptions): Promise<UploadImageResult> {
  try {
    // Valida tamanho do arquivo
    if (file.size > MAX_FILE_SIZE_IN_BYTES) {
      toaster.create({
        title: 'Erro no upload',
        description: `A imagem deve ter no máximo ${MAX_FILE_SIZE}MB.`,
        type: 'error',
      })
      return {
        success: false,
        error: `Arquivo excede o tamanho máximo de ${MAX_FILE_SIZE}MB`,
      }
    }

    // Mostra toast de progresso
    toaster.create({
      title: 'Fazendo upload da imagem...',
      description: 'Por favor, aguarde enquanto a imagem é enviada.',
      type: 'info',
    })

    // Converte para base64 e faz upload
    const fileList = new DataTransfer()
    fileList.items.add(file)
    const imageToBase64 = await toBase64(fileList.files)
    const url = await uploadFileWithBase64(imageToBase64 as string, folder)

    return {
      success: true,
      url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Valida se um arquivo de imagem foi selecionado
 * @param fileList - Lista de arquivos do input
 * @returns true se válido
 */
export function validateImageFile(fileList: FileList | null): boolean {
  if (!fileList || fileList.length === 0) {
    toaster.create({
      title: 'Imagem obrigatória',
      description: 'Por favor, selecione uma imagem.',
      type: 'error',
    })
    return false
  }
  return true
}

export interface UploadMultipleImagesOptions {
  files: File[]
  folder: string
}

export interface UploadMultipleImagesResult {
  success: boolean
  urls?: string[]
  error?: string
}

/**
 * Valida e faz upload de múltiplas imagens
 * @param options - Opções de upload (array de arquivos e pasta)
 * @returns Resultado do upload com URLs ou erro
 */
export async function uploadMultipleImages({
  files,
  folder,
}: UploadMultipleImagesOptions): Promise<UploadMultipleImagesResult> {
  try {
    // Valida tamanho de cada arquivo
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_IN_BYTES) {
        toaster.create({
          title: 'Erro no upload',
          description: `Todas as imagens devem ter no máximo ${MAX_FILE_SIZE}MB.`,
          type: 'error',
        })
        return {
          success: false,
          error: `Arquivo ${file.name} excede o tamanho máximo de ${MAX_FILE_SIZE}MB`,
        }
      }
    }

    // Mostra toast de progresso
    toaster.create({
      title: 'Fazendo upload das imagens...',
      description: `Enviando ${files.length} ${
        files.length === 1 ? 'imagem' : 'imagens'
      }...`,
      type: 'info',
    })

    // Faz upload de todas as imagens em paralelo
    const uploadPromises = files.map(async (file) => {
      const fileList = new DataTransfer()
      fileList.items.add(file)
      const imageToBase64 = await toBase64(fileList.files)
      return uploadFileWithBase64(imageToBase64 as string, folder)
    })

    const urls = await Promise.all(uploadPromises)

    return {
      success: true,
      urls,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
