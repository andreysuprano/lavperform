import type { BrandingData, FaqData } from '../../../../types'

export interface Props {
  data: FaqData
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
