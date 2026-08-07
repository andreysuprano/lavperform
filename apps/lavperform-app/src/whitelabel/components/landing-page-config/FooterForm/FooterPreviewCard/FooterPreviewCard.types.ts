import type { BrandingData, FooterData } from '../../../../types'

export interface Props {
  data: FooterData
  branding?: Pick<
    BrandingData,
    'name' | 'slogan' | 'logo' | 'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
