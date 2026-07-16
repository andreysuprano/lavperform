import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IEducationalWeekEventRepository } from '../../domain/educational-week-event.repository.interface';
import { EducationalWeekEvent } from '../../domain/educational-week-event.entity';
import { EducationalWeekEventMapper } from './mappers/educational-week-event.mapper';

@Injectable()
export class EducationalWeekEventPrismaRepository implements IEducationalWeekEventRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<EducationalWeekEvent>): Promise<EducationalWeekEvent> {
        const created = await this.prisma.educationalWeekEvents.create({
            data: data as any,
        });
        return EducationalWeekEventMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<EducationalWeekEvent[]> {
        const events = await this.prisma.educationalWeekEvents.findMany(options);
        return events.map(EducationalWeekEventMapper.toDomain);
    }

    async findById(id: string): Promise<EducationalWeekEvent | null> {
        const event = await this.prisma.educationalWeekEvents.findUnique({
            where: { id },
        });
        return event ? EducationalWeekEventMapper.toDomain(event) : null;
    }

    async findByCurrentWeek(): Promise<EducationalWeekEvent[]> {
        const currentDate = new Date();
        const currentDay = currentDate.getDay();
        const sunday = new Date(currentDate);
        const saturday = new Date(currentDate);

        sunday.setDate(currentDate.getDate() - currentDay);
        saturday.setDate(currentDate.getDate() + (6 - currentDay));

        const events = await this.prisma.educationalWeekEvents.findMany({
            where: {
                eventDate: {
                    gte: sunday,
                    lte: saturday,
                },
            },
            orderBy: {
                eventDate: 'asc',
            },
        });

        return events.map(EducationalWeekEventMapper.toDomain);
    }

    async update(id: string, data: Partial<EducationalWeekEvent>): Promise<EducationalWeekEvent> {
        const updated = await this.prisma.educationalWeekEvents.update({
            where: { id },
            data: data as any,
        });
        return EducationalWeekEventMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        try {
            await this.prisma.educationalWeekEvents.delete({
                where: { id },
            });
        } catch (error: any) {
            if (error.code !== 'P2025') {
                throw error;
            }
        }
    }

    async count(options?: any): Promise<number> {
        return this.prisma.educationalWeekEvents.count(options);
    }
}
