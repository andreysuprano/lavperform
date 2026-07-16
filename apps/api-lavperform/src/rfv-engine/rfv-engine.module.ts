import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RfvEngineController } from './presentation/rfv-engine.controller';
import { RfvEngineService } from './application/rfv-engine.service';
import { RfvCalculatorService } from './application/rfv-calculator.service';
import { RfvCalculationProcessor } from './infrastructure/jobs/rfv-calculation.processor';
import { BatchRfvCalculationProcessor } from './infrastructure/jobs/batch-rfv-calculation.processor';
import { RfvAutoConfigurationProcessor } from './infrastructure/jobs/rfv-auto-configuration.processor';
import { RfvCalculationTasks } from './crons/rfv-calculation-tasks';
import { OrderCreatedListener } from './listeners/order-created.listener';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaRfvSegmentRepository } from './infrastructure/persistence/prisma-rfv-segment.repository';
import { PrismaRfvConfigurationRepository } from './infrastructure/persistence/prisma-rfv-configuration.repository';
import { RecencyStrategy } from './infrastructure/strategies/recency.strategy';
import { FrequencyStrategy } from './infrastructure/strategies/frequency.strategy';
import { MonetaryStrategy } from './infrastructure/strategies/monetary.strategy';
import { CustomerPrismaRepository } from '../customers/infrastructure/persistence/prisma-customer.repository';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue(
            {
                name: QUEUE_NAMES.RFV_CALCULATION,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            },
            {
                name: QUEUE_NAMES.BATCH_RFV_CALCULATION,
                defaultJobOptions: {
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 10000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            },
            {
                name: QUEUE_NAMES.RFV_AUTO_CONFIGURATION,
                defaultJobOptions: {
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 10000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            },
        ),
        BullBoardModule.forFeature(
            {
                name: QUEUE_NAMES.RFV_CALCULATION,
                adapter: BullAdapter,
            },
            {
                name: QUEUE_NAMES.BATCH_RFV_CALCULATION,
                adapter: BullAdapter,
            },
            {
                name: QUEUE_NAMES.RFV_AUTO_CONFIGURATION,
                adapter: BullAdapter,
            },
        ),
    ],
    controllers: [RfvEngineController],
    providers: [
        RfvEngineService,
        RfvCalculatorService,
        ...workerProviders(
            RfvCalculationProcessor,
            BatchRfvCalculationProcessor,
            RfvAutoConfigurationProcessor,
            RfvCalculationTasks,
            OrderCreatedListener,
        ),
        RecencyStrategy,
        FrequencyStrategy,
        MonetaryStrategy,
        {
            provide: 'IRfvSegmentRepository',
            useClass: PrismaRfvSegmentRepository,
        },
        {
            provide: 'IRfvConfigurationRepository',
            useClass: PrismaRfvConfigurationRepository,
        },
        {
            provide: 'ICustomerRepository',
            useClass: CustomerPrismaRepository,
        },
    ],
    exports: [RfvEngineService, 'IRfvConfigurationRepository'],
})
export class RfvEngineModule {}
