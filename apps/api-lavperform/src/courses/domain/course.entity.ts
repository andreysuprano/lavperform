export class Course {
    id: string;
    title: string;
    description: string;
    coverImageUrl: string | null;
    bannerUrl: string | null;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    modules?: any[];

    constructor(partial: Partial<Course>) {
        Object.assign(this, partial);
    }
}
