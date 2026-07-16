import { Gallery as PrismaGallery } from '@prisma/client';
import { Gallery } from '../../../domain/gallery.entity';

export class GalleryMapper {
    static toDomain(prismaGallery: PrismaGallery): Gallery {
        return new Gallery({
            id: prismaGallery.id,
            title: prismaGallery.title,
            description: prismaGallery.description,
            images: prismaGallery.images,
            linkPageId: prismaGallery.linkPageId,
            createdAt: prismaGallery.createdAt,
            updatedAt: prismaGallery.updatedAt,
        });
    }
}
