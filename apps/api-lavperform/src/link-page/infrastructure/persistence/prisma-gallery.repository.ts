import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IGalleryRepository } from '../../domain/gallery.repository.interface';
import { Gallery } from '../../domain/gallery.entity';
import { GalleryMapper } from './mappers/gallery.mapper';

@Injectable()
export class GalleryPrismaRepository implements IGalleryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Gallery>): Promise<Gallery> {
        const created = await this.prisma.gallery.create({
            data: data as any,
        });
        return GalleryMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<Gallery[]> {
        const galleries = await this.prisma.gallery.findMany(options);
        return galleries.map(GalleryMapper.toDomain);
    }

    async findById(id: string): Promise<Gallery | null> {
        const gallery = await this.prisma.gallery.findUnique({
            where: { id },
        });
        return gallery ? GalleryMapper.toDomain(gallery) : null;
    }

    async findByLinkPageId(linkPageId: string): Promise<Gallery[]> {
        const galleries = await this.prisma.gallery.findMany({
            where: { linkPageId },
        });
        return galleries.map(GalleryMapper.toDomain);
    }

    async update(id: string, data: Partial<Gallery>): Promise<Gallery> {
        const updated = await this.prisma.gallery.update({
            where: { id },
            data: data as any,
        });
        return GalleryMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.gallery.delete({
            where: { id },
        });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.gallery.count(options);
    }
}
