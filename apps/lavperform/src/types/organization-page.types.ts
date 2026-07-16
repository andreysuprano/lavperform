import type { Company } from '@/types'

export interface OrganizationPageLink {
  id: string
  label: string
  url?: string
  icon: string
  iconType: string
}

export interface OrganizationPageGallery {
  id: string
  title: string
  description: string
  imageUrl: string
}

export interface OpeningHours {
  id: string
  companyId: string
  dayOfWeek: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface DigitalMenuPartner {
  logoUrl: string
  name: string
}

export interface DigitalMenuIntegration {
  digitalMenuUrl: string
  partner: DigitalMenuPartner
}

export interface OrganizationPage
  extends Pick<Company, 'name' | 'avatarUrl' | 'phone' | 'address'> {
  bgColor: string
  biography: string
  coverImage: string
  digitalMenuIntegration?: DigitalMenuIntegration[]
  galleries: OrganizationPageGallery[]
  linkPages: any[]
  links: OrganizationPageLink[]
  openingHours: OpeningHours[]
  whatsappMessage: string
}
