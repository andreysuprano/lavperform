export class User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    password?: string;
    verifyEmail?: string;
    createdAt: Date;
    updatedAt: Date;
    userCompanies?: any[]; // Could be typed more strictly if needed

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
