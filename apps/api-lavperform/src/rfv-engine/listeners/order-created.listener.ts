import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RfvEngineService } from '../application/rfv-engine.service';

@Injectable()
export class OrderCreatedListener {
    private readonly logger = new Logger(OrderCreatedListener.name);

    constructor(private readonly rfvEngineService: RfvEngineService) {}

    @OnEvent('order.created')
    async handleOrderCreated(payload: { customerId: string }) {
        const { customerId } = payload;

        try {
            await this.rfvEngineService.calculateForCustomer(customerId);
            this.logger.log(`RFV enfileirado para cliente ${customerId} após criação de pedido`);
        } catch (error) {
            this.logger.error(`Erro ao enfileirar RFV para cliente ${customerId}:`, error);
        }
    }
}
