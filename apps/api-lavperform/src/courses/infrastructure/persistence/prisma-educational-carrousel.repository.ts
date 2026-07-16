import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IEducationalCarrouselRepository } from '../../domain/educational-carrousel.repository.interface';
import { EducationalCarrousel } from '../../domain/educational-carrousel.entity';
import { EducationalCarrouselMapper } from './mappers/educational-carrousel.mapper';

@Injectable()
export class EducationalCarrouselPrismaRepository implements IEducationalCarrouselRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<EducationalCarrousel>): Promise<EducationalCarrousel> {
        const created = await this.prisma.educationalCarrousel.create({
            data: data as any,
        });
        return EducationalCarrouselMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<EducationalCarrousel[]> {
        const carrousels = await this.prisma.educationalCarrousel.findMany(options);
        return carrousels.map(EducationalCarrouselMapper.toDomain);
    }

    async findById(id: string): Promise<EducationalCarrousel | null> {
        const carrousel = await this.prisma.educationalCarrousel.findUnique({
            where: { id },
        });
        return carrousel ? EducationalCarrouselMapper.toDomain(carrousel) : null;
    }

    async update(id: string, data: Partial<EducationalCarrousel>): Promise<EducationalCarrousel> {
        const updated = await this.prisma.educationalCarrousel.update({
            where: { id },
            data: data as any,
        });
        return EducationalCarrouselMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.educationalCarrousel.delete({
            where: { id },
        });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.educationalCarrousel.count(options);
    }
}
