import { Injectable, Logger, Inject } from '@nestjs/common';
import { IWeatherAlertHistoryRepository } from '../domain/weather-alert-history.repository.interface';
import { WeatherCondition } from '../domain/weather-alert.entity';

@Injectable()
export class WeatherAlertHistoryService {
    private readonly logger: Logger;

    constructor(
        @Inject('IWeatherAlertHistoryRepository')
        private readonly weatherAlertHistoryRepository: IWeatherAlertHistoryRepository,
    ) {
        this.logger = new Logger(WeatherAlertHistoryService.name);
    }

    async createHistory(data: {
        companyId: string;
        condition: WeatherCondition;
        tempC: number;
        tempF: number;
        messagesSent: number;
    }) {
        this.logger.log(`Criando histórico de alerta para empresa: ${data.companyId}`);

        return this.weatherAlertHistoryRepository.create({
            companyId: data.companyId,
            condition: data.condition,
            tempC: data.tempC,
            tempF: data.tempF,
            messagesSent: data.messagesSent,
            sentAt: new Date(),
        });
    }

    async findByCompanyId(companyId: string) {
        return this.weatherAlertHistoryRepository.findByCompanyId(companyId);
    }

    async findTodayByCompanyId(companyId: string) {
        return this.weatherAlertHistoryRepository.findTodayByCompanyId(companyId);
    }

    async hasAlertTodayForCompany(companyId: string): Promise<boolean> {
        const todayAlert = await this.findTodayByCompanyId(companyId);
        return !!todayAlert;
    }
}
