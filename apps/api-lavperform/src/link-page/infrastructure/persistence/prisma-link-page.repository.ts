import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ILinkPageRepository } from '../../domain/link-page.repository.interface';
import { LinkPage } from '../../domain/link-page.entity';
import { LinkPageMapper } from './mappers/link-page.mapper';

@Injectable()
export class LinkPagePrismaRepository implements ILinkPageRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<LinkPage>): Promise<LinkPage> {
        const created = await this.prisma.linkPage.create({
            data: data as any,
        });
        return LinkPageMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<LinkPage[]> {
        const linkPages = await this.prisma.linkPage.findMany(options);
        return linkPages.map(LinkPageMapper.toDomain);
    }

    async findById(id: string): Promise<LinkPage | null> {
        const linkPage = await this.prisma.linkPage.findUnique({
            where: { id },
        });
        return linkPage ? LinkPageMapper.toDomain(linkPage) : null;
    }

    async findByCompanyId(companyId: string): Promise<LinkPage | null> {
        const linkPage = await this.prisma.linkPage.findFirst({
            where: { companyId },
        });
        return linkPage ? LinkPageMapper.toDomain(linkPage) : null;
    }

    async findByCompanyIdWithRelations(companyId: string): Promise<LinkPage | null> {
        const linkPage = await this.prisma.linkPage.findFirst({
            where: { companyId },
            include: {
                links: {
                    omit: {
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                galleries: {
                    omit: {
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
            omit: {
                createdAt: true,
                updatedAt: true,
            },
        });
        return linkPage ? LinkPageMapper.toDomain(linkPage) : null;
    }

    async update(id: string, data: Partial<LinkPage>): Promise<LinkPage> {
        const updated = await this.prisma.linkPage.update({
            where: { id },
            data: data as any,
        });
        return LinkPageMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.linkPage.delete({
            where: { id },
        });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.linkPage.count(options);
    }

    async updateByCompanyId(companyId: string, data: Partial<LinkPage>): Promise<void> {
        await this.prisma.linkPage.updateMany({
            where: { companyId },
            data: data as any,
        });
    }
}
