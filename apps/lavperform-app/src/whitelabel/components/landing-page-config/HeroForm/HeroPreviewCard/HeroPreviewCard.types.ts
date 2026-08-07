import type { BrandingData, HeroData } from '../../../../types'

export interface Props {
  data: HeroData
  branding?: Pick<
    BrandingData,
    'name' | 'slogan' | 'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
