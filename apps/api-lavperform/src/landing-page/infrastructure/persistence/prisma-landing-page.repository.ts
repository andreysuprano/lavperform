import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ILandingPageRepository } from '../../domain/landing-page.repository.interface';
import { LandingPage } from '../../domain/landing-page.entity';
import { LandingPageMapper } from './mappers/landing-page.mapper';

@Injectable()
export class LandingPagePrismaRepository implements ILandingPageRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<LandingPage>): Promise<LandingPage> {
        const created = await this.prisma.landingPage.create({
            data: data as any,
        });
        return LandingPageMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<LandingPage[]> {
        const landingPages = await this.prisma.landingPage.findMany(options);
        return landingPages.map(LandingPageMapper.toDomain);
    }

    async findById(id: string): Promise<LandingPage | null> {
        const landingPage = await this.prisma.landingPage.findUnique({
            where: { id },
        });
        return landingPage ? LandingPageMapper.toDomain(landingPage) : null;
    }

    async findBySlug(slug: string): Promise<LandingPage | null> {
        const landingPage = await this.prisma.landingPage.findUnique({
            where: { slug },
            include: {
                company: true,
            },
        });
        return landingPage ? LandingPageMapper.toDomain(landingPage) : null;
    }

    async findByCompanyId(companyId: string): Promise<LandingPage[]> {
        const landingPages = await this.prisma.landingPage.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
        return landingPages.map(LandingPageMapper.toDomain);
    }

    async findActiveBySlug(slug: string): Promise<LandingPage | null> {
        const landingPage = await this.prisma.landingPage.findFirst({
            where: {
                slug,
                active: true,
            },
            include: {
                company: true,
            },
        });
        return landingPage ? LandingPageMapper.toDomain(landingPage) : null;
    }

    async update(id: string, data: Partial<LandingPage>): Promise<LandingPage> {
        const updated = await this.prisma.landingPage.update({
            where: { id },
            data: data as any,
        });
        return LandingPageMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.landingPage.delete({
            where: { id },
        });
    }

    async findByCustomDomain(customDomain: string): Promise<LandingPage | null> {
        const landingPage = await this.prisma.landingPage.findUnique({
            where: { customDomain },
            include: {
                company: true,
            },
        });
        return landingPage ? LandingPageMapper.toDomain(landingPage) : null;
    }

    async findActiveByCustomDomain(customDomain: string): Promise<LandingPage | null> {
        const landingPage = await this.prisma.landingPage.findFirst({
            where: {
                customDomain,
                active: true,
            },
            include: {
                company: true,
            },
        });
        return landingPage ? LandingPageMapper.toDomain(landingPage) : null;
    }
}
