import { LandingPage as PrismaLandingPage } from '@prisma/client';
import { LandingPage } from '../../../domain/landing-page.entity';

export class LandingPageMapper {
    static toDomain(prismaLandingPage: any): LandingPage {
        return new LandingPage({
            id: prismaLandingPage.id,
            companyId: prismaLandingPage.companyId,
            slug: prismaLandingPage.slug,
            customDomain: prismaLandingPage.customDomain,
            active: prismaLandingPage.active,
            template: prismaLandingPage.template,
            branding: prismaLandingPage.branding,
            hero: prismaLandingPage.hero,
            services: prismaLandingPage.services,
            location: prismaLandingPage.location,
            faq: prismaLandingPage.faq,
            testimonials: prismaLandingPage.testimonials,
            cta: prismaLandingPage.cta,
            footer: prismaLandingPage.footer,
            navigation: prismaLandingPage.navigation,
            createdAt: prismaLandingPage.createdAt,
            updatedAt: prismaLandingPage.updatedAt,
            company: prismaLandingPage.company,
        });
    }
}
