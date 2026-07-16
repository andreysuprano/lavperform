import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { WeatherAlertService } from './application/weather-alert.service';
import { WeatherDataService } from './application/weather-data.service';
import { WeatherAlertHistoryService } from './application/weather-alert-history.service';
import { WeatherAlertController } from './presentation/weather-alert.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WeatherAlertPrismaRepository } from './infrastructure/persistence/prisma-weather-alert.repository';
import { WeatherDataPrismaRepository } from './infrastructure/persistence/prisma-weather-data.repository';
import { WeatherAlertHistoryPrismaRepository } from './infrastructure/persistence/prisma-weather-alert-history.repository';
import { WeatherApiService } from './infrastructure/api/weather-api.service';
import { WeatherUpdateProcessor } from './infrastructure/jobs/weather-update.processor';
import { WeatherAlertProcessor } from './infrastructure/jobs/weather-alert.processor';
import { WeatherUpdateTasks } from './crons/weather-update-tasks';
import { WeatherAlertTasks } from './crons/weather-alert-tasks';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { workerProviders } from '../common/queue/worker-runtime.config';
import { RenitencyModule } from '../renitency/renitency.module';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
        RenitencyModule,
        BullModule.registerQueue({
            name: QUEUE_NAMES.WEATHER_UPDATE,
        }),
        BullBoardModule.forFeature({
            name: QUEUE_NAMES.WEATHER_UPDATE,
            adapter: BullAdapter,
        }),
        BullModule.registerQueue({
            name: QUEUE_NAMES.WEATHER_ALERT_PROCESSOR,
        }),
        BullBoardModule.forFeature({
            name: QUEUE_NAMES.WEATHER_ALERT_PROCESSOR,
            adapter: BullAdapter,
        }),
        BullModule.registerQueue({
            name: QUEUE_NAMES.MESSAGE_ENGINE,
        }),
    ],
    controllers: [WeatherAlertController],
    providers: [
        WeatherAlertService,
        WeatherDataService,
        WeatherAlertHistoryService,
        WeatherApiService,
        ...workerProviders(
            WeatherUpdateProcessor,
            WeatherAlertProcessor,
            WeatherUpdateTasks,
            WeatherAlertTasks,
        ),
        {
            provide: 'IWeatherAlertRepository',
            useClass: WeatherAlertPrismaRepository,
        },
        {
            provide: 'IWeatherDataRepository',
            useClass: WeatherDataPrismaRepository,
        },
        {
            provide: 'IWeatherAlertHistoryRepository',
            useClass: WeatherAlertHistoryPrismaRepository,
        },
    ],
    exports: [
        WeatherAlertService,
        WeatherDataService,
        WeatherAlertHistoryService,
        'IWeatherAlertRepository',
        'IWeatherDataRepository',
        'IWeatherAlertHistoryRepository',
    ],
})
export class WeatherAlertModule { }
