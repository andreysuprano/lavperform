import type { BrandingData, TestimonialsData } from '../../../../types'

export interface Props {
  data: TestimonialsData
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
