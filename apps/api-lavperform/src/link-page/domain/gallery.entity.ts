export class Gallery {
    id: string;
    title: string;
    description: string;
    images: string[];
    linkPageId: string;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    linkPage?: any;

    constructor(partial: Partial<Gallery>) {
        Object.assign(this, partial);
    }
}
