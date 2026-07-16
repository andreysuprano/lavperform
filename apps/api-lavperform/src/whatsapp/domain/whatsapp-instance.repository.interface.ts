import { IRepository } from '../../common/database/repository.interface';
import { WhatsappInstance } from './whatsapp-instance.entity';
import { WhatsappInstanceStatus } from '@prisma/client';

export interface IWhatsappInstanceRepository extends IRepository<WhatsappInstance> {
    findByCompanyId(companyId: string): Promise<WhatsappInstance | null>;
    findActiveByCompanyId(companyId: string): Promise<WhatsappInstance | null>;
    updateStatus(id: string, status: WhatsappInstanceStatus): Promise<WhatsappInstance>;
}
