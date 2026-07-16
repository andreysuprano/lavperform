import { EducationalCarrousel as PrismaEducationalCarrousel } from '@prisma/client';
import { EducationalCarrousel } from '../../../domain/educational-carrousel.entity';

export class EducationalCarrouselMapper {
    static toDomain(prismaCarrousel: PrismaEducationalCarrousel): EducationalCarrousel {
        return new EducationalCarrousel({
            id: prismaCarrousel.id,
            title: prismaCarrousel.title,
            description: prismaCarrousel.description,
            videoUrl: prismaCarrousel.videoUrl,
            thumbnailUrl: prismaCarrousel.thumbnailUrl,
            ctaLabel: prismaCarrousel.ctaLabel,
            ctaUrl: prismaCarrousel.ctaUrl,
            order: prismaCarrousel.order,
            isStream: prismaCarrousel.isStream,
            createdAt: prismaCarrousel.createdAt,
            updatedAt: prismaCarrousel.updatedAt,
        });
    }
}
