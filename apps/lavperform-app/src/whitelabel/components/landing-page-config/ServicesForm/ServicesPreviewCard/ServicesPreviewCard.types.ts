import type { BrandingData, ServicesData } from '../../../../types'

export interface Props {
  data: ServicesData
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
