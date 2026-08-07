import type { BrandingData, CtaData } from '../../../../types'

export interface Props {
  data: CtaData
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
