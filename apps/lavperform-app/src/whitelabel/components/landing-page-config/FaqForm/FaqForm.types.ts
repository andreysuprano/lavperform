import type { BrandingData, FaqData } from '../../../types'

export interface Props {
  data: FaqData
  onChange: (data: FaqData) => void
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
