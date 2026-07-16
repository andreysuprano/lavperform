import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversionWindowController } from './presentation/conversion-window.controller';
import { ConversionWindowService } from './application/conversion-window.service';
import { PrismaConversionWindowRepository } from './infrastructure/persistence/prisma-conversion-window.repository';

@Module({
    imports: [PrismaModule],
    controllers: [ConversionWindowController],
    providers: [
        ConversionWindowService,
        {
            provide: 'IConversionWindowRepository',
            useClass: PrismaConversionWindowRepository,
        },
    ],
    exports: [ConversionWindowService, 'IConversionWindowRepository'],
})
export class ConversionWindowModule {}
