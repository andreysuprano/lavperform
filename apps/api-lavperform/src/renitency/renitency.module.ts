import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RenitencyController } from './presentation/renitency.controller';
import { RenitencyService } from './application/renitency.service';
import { RenitencyEvaluatorService } from './application/renitency-evaluator.service';
import { PrismaRenitencyConfigurationRepository } from './infrastructure/persistence/prisma-renitency-configuration.repository';

@Module({
    imports: [PrismaModule],
    controllers: [RenitencyController],
    providers: [
        RenitencyService,
        RenitencyEvaluatorService,
        {
            provide: 'IRenitencyConfigurationRepository',
            useClass: PrismaRenitencyConfigurationRepository,
        },
    ],
    exports: [RenitencyService, RenitencyEvaluatorService],
})
export class RenitencyModule {}
