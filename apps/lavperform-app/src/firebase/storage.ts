import { getDownloadURL, ref, uploadString } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

import { logger } from '@/utils/logger'

import { storage } from './config'

export const uploadFileWithBase64 = async (
  base64: string,
  path: string
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!base64 || base64.trim() === '') {
      reject(new Error('Base64 inválido ou vazio'))
      return
    }

    const name = uuidv4()
    const storageRef = ref(storage, `${path}/${name}`)

    uploadString(storageRef, base64, 'data_url')
      .then(async (snapshot) => {
        logger.info('Upload concluído:', snapshot.metadata.fullPath)

        // Aguarda um pequeno delay para garantir que o Firebase processou o arquivo
        await new Promise((resolve) => setTimeout(resolve, 500))

        const downloadURL = await getDownloadURL(storageRef)

        if (!downloadURL || downloadURL.trim() === '') {
          reject(new Error('URL de download não foi gerada'))
          return
        }

        logger.info('URL gerada:', downloadURL)
        resolve(downloadURL)
      })
      .catch((err) => {
        logger.error('Erro no upload para Firebase:', err)
        reject(
          new Error(`Falha no upload: ${err.message || 'Erro desconhecido'}`)
        )
      })
  })

export const toBase64 = async (fileList: FileList) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(fileList[0])
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })

export const listToBase64 = async (fileList: File[]) =>
  await Promise.all(
    fileList.map(
      async (file) =>
        await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
        })
    )
  )

export const convertLinkToResizedImage = (link: string) => {
  if (!link?.trim()) return link
  if (
    link.includes('firebasestorage.googleapis.com') ||
    link.includes('_200x200')
  ) {
    return link
  }

  const [baseUrl, ...params] = link.split('?')
  const queryParams = params.length > 0 ? `?${params.join('?')}` : ''

  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/i

  const match = baseUrl.match(imageExtensions)

  if (match) {
    const extension = match[0]
    const fileNameWithoutExtension = baseUrl.substring(
      0,
      baseUrl.length - extension.length
    )
    return `${fileNameWithoutExtension}_200x200${extension}${queryParams}`
  }
  return `${baseUrl}${queryParams}`
}
