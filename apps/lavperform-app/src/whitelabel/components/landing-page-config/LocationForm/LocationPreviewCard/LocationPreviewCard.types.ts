import type { BrandingData, LocationData } from '../../../../types'

export interface Props {
  data: LocationData
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  >
}
