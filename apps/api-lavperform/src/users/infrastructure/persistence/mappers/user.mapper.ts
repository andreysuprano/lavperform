import { User as PrismaUser } from '@prisma/client';
import { User } from '../../../domain/user.entity';

export class UserMapper {
    static toDomain(prismaUser: PrismaUser): User {
        return new User({
            id: prismaUser.id,
            name: prismaUser.name,
            email: prismaUser.email,
            phone: prismaUser.phone,
            password: prismaUser.password, // Keep password for auth checks, but typically not for responses
            // verifyEmail: prismaUser.verifyEmail,
            createdAt: prismaUser.createdAt,
            updatedAt: prismaUser.updatedAt,
        });
    }

    // Helper to return safe user object (without password)
    static toSafeDomain(prismaUser: PrismaUser): Omit<User, 'password'> {
        const { password, ...safeUser } = new User({
            id: prismaUser.id,
            name: prismaUser.name,
            email: prismaUser.email,
            phone: prismaUser.phone,
            // verifyEmail: prismaUser.verifyEmail,
            createdAt: prismaUser.createdAt,
            updatedAt: prismaUser.updatedAt,
        });
        return safeUser;
    }
}
