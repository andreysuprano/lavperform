import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ILinkRepository } from '../../domain/link.repository.interface';
import { Link } from '../../domain/link.entity';
import { LinkMapper } from './mappers/link.mapper';

@Injectable()
export class LinkPrismaRepository implements ILinkRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Link>): Promise<Link> {
        const created = await this.prisma.link.create({
            data: data as any,
        });
        return LinkMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<Link[]> {
        const links = await this.prisma.link.findMany(options);
        return links.map(LinkMapper.toDomain);
    }

    async findById(id: string): Promise<Link | null> {
        const link = await this.prisma.link.findUnique({
            where: { id },
        });
        return link ? LinkMapper.toDomain(link) : null;
    }

    async findByLinkPageId(linkPageId: string): Promise<Link[]> {
        const links = await this.prisma.link.findMany({
            where: { linkPageId },
        });
        return links.map(LinkMapper.toDomain);
    }

    async update(id: string, data: Partial<Link>): Promise<Link> {
        const updated = await this.prisma.link.update({
            where: { id },
            data: data as any,
        });
        return LinkMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.link.delete({
            where: { id },
        });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.link.count(options);
    }
}
