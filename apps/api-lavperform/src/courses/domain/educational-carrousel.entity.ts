export class EducationalCarrousel {
    id: string;
    title: string;
    description: string;
    videoUrl: string | null;
    thumbnailUrl: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    order: number;
    isStream: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<EducationalCarrousel>) {
        Object.assign(this, partial);
    }
}
