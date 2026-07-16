export interface BrandingData {
    name: string;
    slogan: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
}

export interface HeroHours {
    label: string;
    time: string;
    days: string;
}

export interface HeroPayment {
    label: string;
    methods: string;
}

export interface HeroData {
    title: string;
    highlightWord: string;
    subtitle: string;
    location: string;
    backgroundImage: string;
    hours: HeroHours;
    payment: HeroPayment;
    ctaText: string;
    ctaLink: string;
}

export interface ServiceItem {
    title: string;
    description: string;
    price: string;
    vantageList: string[];
}

export interface ServicesData {
    title: string;
    description: string;
    items: ServiceItem[];
}

export interface LocationItem {
    placeName: string;
    address: string;
    mapUrl: string;
    mapEmbedUrl: string;
    googleMapsLink: string;
}

export interface LocationData {
    title: string;
    description: string;
    items: LocationItem[];
}

export interface FaqItem {
    value: string;
    title: string;
    text: string;
}

export interface FaqData {
    title: string;
    description: string;
    items: FaqItem[];
}

export interface TestimonialItem {
    quote: string;
    author: string;
}

export interface TestimonialsData {
    title: string;
    description: string;
    items: TestimonialItem[];
}

export interface CtaData {
    title: string;
    description: string;
    buttonText: string;
    whatsappNumber: string;
}

export interface FooterData {
    description: string;
    locationTitle: string;
    address: string;
    copyright: string;
}

export interface NavigationItem {
    label: string;
    href: string;
}

export class LandingPage {
    id: string;
    companyId: string;
    slug: string;
    customDomain: string | null;
    active: boolean;
    template: string;
    branding: BrandingData;
    hero: HeroData;
    services: ServicesData;
    location: LocationData;
    faq: FaqData;
    testimonials: TestimonialsData;
    cta: CtaData;
    footer: FooterData;
    navigation: NavigationItem[];
    createdAt: Date;
    updatedAt: Date;

    // Relations
    company?: any;

    constructor(partial: Partial<LandingPage>) {
        Object.assign(this, partial);
    }
}
