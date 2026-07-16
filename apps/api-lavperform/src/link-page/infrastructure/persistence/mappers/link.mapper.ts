import { Link as PrismaLink } from '@prisma/client';
import { Link } from '../../../domain/link.entity';

export class LinkMapper {
    static toDomain(prismaLink: PrismaLink): Link {
        return new Link({
            id: prismaLink.id,
            label: prismaLink.label,
            url: prismaLink.url,
            linkPageId: prismaLink.linkPageId,
            icon: prismaLink.icon,
            iconType: prismaLink.iconType,
            createdAt: prismaLink.createdAt,
            updatedAt: prismaLink.updatedAt,
        });
    }
}
