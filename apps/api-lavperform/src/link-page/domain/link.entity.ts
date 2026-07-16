export class Link {
    id: string;
    label: string;
    url: string;
    linkPageId: string;
    icon: string;
    iconType: string;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    linkPage?: any;

    constructor(partial: Partial<Link>) {
        Object.assign(this, partial);
    }
}
