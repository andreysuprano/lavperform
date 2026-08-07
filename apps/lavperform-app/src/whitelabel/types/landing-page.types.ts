export interface BrandingData {
  name: string
  slogan: string
  logo: string
  primaryColor?: string
  secondaryColor?: string
  tertiaryColor?: string
}

export interface HeroHours {
  label: string
  time: string
  days: string
}

export interface HeroPayment {
  label: string
  methods: string
}

export interface HeroData {
  title: string
  highlightWord: string
  subtitle: string
  location: string
  backgroundImage: string
  hours: HeroHours
  payment: HeroPayment
  ctaText: string
  ctaLink: string
}

export interface ServiceItem {
  title: string
  description: string
  price: string
  vantageList: string[]
}

export interface ServicesData {
  title: string
  description: string
  items: ServiceItem[]
}

export interface LocationItem {
  id?: string
  placeName: string
  address: string
  mapUrl: string
  mapEmbedUrl: string
  googleMapsLink: string
}

export interface LocationData {
  title: string
  description: string
  items: LocationItem[]
}

/**
 * @deprecated Formato legado exigido pelo backend por validação.
 * Os campos planos (placeName, address, etc.) espelham items[0].
 * Remover quando o backend suportar items[] diretamente.
 */
export interface LocationBackendPayload extends LocationData {
  placeName: string
  address: string
  mapUrl: string
  mapEmbedUrl: string
  googleMapsLink: string
}

export interface FaqItem {
  value: string
  title: string
  text: string
}

export interface FaqData {
  title: string
  description: string
  items: FaqItem[]
}

export interface TestimonialItem {
  quote: string
  author: string
}

export interface TestimonialsData {
  title: string
  description: string
  items: TestimonialItem[]
}

export interface CtaData {
  title: string
  description: string
  buttonText: string
  whatsappNumber: string
}

export interface FooterData {
  description: string
  locationTitle: string
  address: string
  copyright: string
}

export interface NavigationItem {
  label: string
  href: string
}

/** Templates disponíveis no client-landing (TemplateRenderer) */
export type LandingPageTemplate = 'default' | 'modern' | 'elegant'

export const LANDING_PAGE_TEMPLATES: {
  value: LandingPageTemplate
  label: string
  description: string
}[] = [
  {
    value: 'default',
    label: 'Padrão',
    description: 'Layout clássico e equilibrado para a maioria das lavanderias',
  },
  {
    value: 'modern',
    label: 'Moderno',
    description: 'Visual contemporâneo com ênfase em cards e espaçamento',
  },
  {
    value: 'elegant',
    label: 'Elegante',
    description: 'Estilo sofisticado com tipografia e detalhes refinados',
  },
]

export interface LandingPageData {
  branding: BrandingData
  hero: HeroData
  services: ServicesData
  location: LocationData
  faq: FaqData
  testimonials: TestimonialsData
  cta: CtaData
  footer: FooterData
  navigation: NavigationItem[]
}

export interface LandingPageFormData {
  branding: BrandingData
  hero: HeroData
  services: ServicesData
  location: LocationData
  faq: FaqData
  testimonials: TestimonialsData
  cta: CtaData
  footer: FooterData
  navigation: NavigationItem[]
}

export interface LandingPageConfig {
  id: string
  companyId: string
  template?: LandingPageTemplate
  data: LandingPageData
  createdAt?: string
  updatedAt?: string
}

/**
 * Resposta completa da landing page pública do backend
 * Inclui metadados adicionais como slug, customDomain, etc.
 */
export interface PublicLandingPageResponse {
  id: string
  companyId: string
  slug: string
  customDomain?: string
  active: boolean
  template?: LandingPageTemplate | string
  branding: BrandingData
  hero: HeroData
  services: ServicesData
  location: LocationData
  faq: FaqData
  testimonials: TestimonialsData
  cta: CtaData
  footer: FooterData
  navigation: NavigationItem[]
  createdAt: string
  updatedAt: string
}

/**
 * Payload para atualização parcial da landing page pública
 * Permite atualizar qualquer seção ou campos como active, customDomain
 */
export interface UpdateLandingPagePayload {
  branding?: BrandingData
  hero?: HeroData
  services?: ServicesData
  location?: LocationData | LocationBackendPayload
  faq?: FaqData
  testimonials?: TestimonialsData
  cta?: CtaData
  footer?: FooterData
  navigation?: NavigationItem[]
  template?: LandingPageTemplate | string
  customDomain?: string
  active?: boolean
}
