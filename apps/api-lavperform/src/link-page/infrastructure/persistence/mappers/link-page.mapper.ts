import { LinkPage as PrismaLinkPage } from '@prisma/client';
import { LinkPage } from '../../../domain/link-page.entity';

export class LinkPageMapper {
    static toDomain(prismaLinkPage: any): LinkPage {
        return new LinkPage({
            id: prismaLinkPage.id,
            companyId: prismaLinkPage.companyId,
            biography: prismaLinkPage.biography,
            whatsappMessage: prismaLinkPage.whatsappMessage,
            coverImage: prismaLinkPage.coverImage,
            bgColor: prismaLinkPage.bgColor,
            createdAt: prismaLinkPage.createdAt,
            updatedAt: prismaLinkPage.updatedAt,
            company: prismaLinkPage.company,
            links: prismaLinkPage.links,
            galleries: prismaLinkPage.galleries,
        });
    }
}
