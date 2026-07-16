import { WhatsappInstance as PrismaWhatsappInstance } from '@prisma/client';
import { WhatsappInstance } from '../../../domain/whatsapp-instance.entity';

export class WhatsappInstanceMapper {
    static toDomain(prismaInstance: PrismaWhatsappInstance): WhatsappInstance {
        return new WhatsappInstance({
            id: prismaInstance.id,
            name: prismaInstance.name,
            status: prismaInstance.status,
            token: prismaInstance.token,
            phoneNumber: prismaInstance.phoneNumber,
            companyId: prismaInstance.companyId,
            createdAt: prismaInstance.createdAt,
            updatedAt: prismaInstance.updatedAt,
        });
    }
}
