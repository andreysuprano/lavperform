export interface FormDataProps {
  campaignType: 'REACTIVATION' | 'RECURRENCE'
  messageText: string
  deliveryRadius: number
  discountCurrency: number
  discountPercent: number
  discountType?: 'percent' | 'currency'
  endDate: string | null
  images: FileList
  imagesBase64: [] // Deprecated: usar existingImageUrls e newImagesBase64
  existingImageUrls?: string[] // URLs de imagens já no Firebase
  newImagesBase64?: string[] // Base64 de novas imagens para upload
  totalImages?: number // Total de imagens (existentes + novas)
  incitation: 'discount' | 'tax' | 'none'
  maxDailySends: number
  name: string
  segmentation: string[]
  daysOfWeek: string[]
  startDate: string
  target: string[]
  selectedDays?: number[]
}

export interface FormStepsProps {
  id?: number
  onSubmit?: (data: FormData) => void
  formData?: FormDataProps
}
