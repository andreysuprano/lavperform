export interface LaundryData {
  template?: string // Nome do template a ser usado (ex: "default", "modern", "minimal")
  branding: {
    name: string
    slogan: string
    logo: string
    primaryColor: string
    secondaryColor: string
    tertiaryColor: string
  }
  hero: {
    title: string
    highlightWord: string
    subtitle: string
    location: string
    backgroundImage: string
    hours: {
      label: string
      time: string
      days: string
    }
    payment: {
      label: string
      methods: string
    }
    ctaText: string
    ctaLink: string
  }
  services: {
    title: string
    description: string
    items: Array<{
      title: string
      description: string
      price: string
      vantageList: string[]
    }>
  }
  location: {
    title: string
    description: string
    items: Array<{
      placeName: string
      address: string
      mapUrl: string
      mapEmbedUrl: string
      googleMapsLink: string
    }>
  }
  faq: {
    title: string
    description: string
    items: Array<{
      value: string
      title: string
      text: string
    }>
  }
  testimonials: {
    title: string
    description: string
    items: Array<{
      quote: string
      author: string
    }>
  }
  cta: {
    title: string
    description: string
    buttonText: string
    whatsappNumber: string
  }
  footer: {
    description: string
    locationTitle: string
    address: string
    copyright: string
  }
  navigation: Array<{
    label: string
    href: string
  }>
}
