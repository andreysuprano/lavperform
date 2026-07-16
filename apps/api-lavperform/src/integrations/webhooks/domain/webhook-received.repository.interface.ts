import { IRepository } from '../../../common/database/repository.interface';
import { WebhookReceived } from './webhook-received.entity';

export interface IWebhookReceivedRepository extends IRepository<WebhookReceived> {
    findByCompanyId(companyId: string, options?: any): Promise<WebhookReceived[]>;
    findByPartnerId(partnerId: string, options?: any): Promise<WebhookReceived[]>;
}
