import type { BrandingData, HeroData } from '../../../types'

export interface Props {
  data: HeroData
  onChange: (data: HeroData) => void
  branding?: Pick<
    BrandingData,
    'name' | 'slogan' | 'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
