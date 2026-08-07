import type { BrandingData, TestimonialsData } from '../../../types'

export interface Props {
  data: TestimonialsData
  onChange: (data: TestimonialsData) => void
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
