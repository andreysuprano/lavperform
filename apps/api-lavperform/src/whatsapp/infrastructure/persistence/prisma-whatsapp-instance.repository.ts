import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IWhatsappInstanceRepository } from '../../domain/whatsapp-instance.repository.interface';
import { WhatsappInstance } from '../../domain/whatsapp-instance.entity';
import { WhatsappInstanceMapper } from './mappers/whatsapp-instance.mapper';
import { WhatsappInstanceStatus } from '@prisma/client';

@Injectable()
export class WhatsappInstancePrismaRepository implements IWhatsappInstanceRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<WhatsappInstance>): Promise<WhatsappInstance> {
        const created = await this.prisma.whatsappInstance.create({
            data: data as any,
        });
        return WhatsappInstanceMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<WhatsappInstance[]> {
        const instances = await this.prisma.whatsappInstance.findMany(options);
        return instances.map(WhatsappInstanceMapper.toDomain);
    }

    async findById(id: string): Promise<WhatsappInstance | null> {
        const instance = await this.prisma.whatsappInstance.findUnique({
            where: { id },
        });
        return instance ? WhatsappInstanceMapper.toDomain(instance) : null;
    }

    async findByCompanyId(companyId: string): Promise<WhatsappInstance | null> {
        const instance = await this.prisma.whatsappInstance.findFirst({
            where: { companyId },
        });
        return instance ? WhatsappInstanceMapper.toDomain(instance) : null;
    }

    async findActiveByCompanyId(companyId: string): Promise<WhatsappInstance | null> {
        const instance = await this.prisma.whatsappInstance.findFirst({
            where: {
                companyId,
                status: {
                    not: WhatsappInstanceStatus.DISCONNECTED,
                },
            },
        });
        return instance ? WhatsappInstanceMapper.toDomain(instance) : null;
    }

    async update(id: string, data: Partial<WhatsappInstance>): Promise<WhatsappInstance> {
        const updated = await this.prisma.whatsappInstance.update({
            where: { id },
            data: data as any,
        });
        return WhatsappInstanceMapper.toDomain(updated);
    }

    async updateStatus(id: string, status: WhatsappInstanceStatus): Promise<WhatsappInstance> {
        const updated = await this.prisma.whatsappInstance.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
        return WhatsappInstanceMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.whatsappInstance.delete({
            where: { id },
        });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.whatsappInstance.count(options);
    }
}
