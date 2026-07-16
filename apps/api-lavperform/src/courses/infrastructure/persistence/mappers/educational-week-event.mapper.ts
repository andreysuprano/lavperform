import { EducationalWeekEvents as PrismaEducationalWeekEvents } from '@prisma/client';
import { EducationalWeekEvent } from '../../../domain/educational-week-event.entity';

export class EducationalWeekEventMapper {
    static toDomain(prismaEvent: PrismaEducationalWeekEvents): EducationalWeekEvent {
        return new EducationalWeekEvent({
            id: prismaEvent.id,
            title: prismaEvent.title,
            description: prismaEvent.description,
            coverImage: prismaEvent.coverImage,
            ctaLabel: prismaEvent.ctaLabel,
            ctaUrl: prismaEvent.ctaUrl,
            eventDate: prismaEvent.eventDate,
            isStream: prismaEvent.isStream,
            createdAt: prismaEvent.createdAt,
            updatedAt: prismaEvent.updatedAt,
        });
    }
}
