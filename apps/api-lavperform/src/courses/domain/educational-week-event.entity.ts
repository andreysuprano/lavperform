export class EducationalWeekEvent {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    eventDate: Date;
    isStream: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<EducationalWeekEvent>) {
        Object.assign(this, partial);
    }
}
