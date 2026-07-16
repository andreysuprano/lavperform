import { WeatherAlertHistory } from '../../../domain/weather-alert-history.entity';

export class WeatherAlertHistoryMapper {
    static toDomain(prismaHistory: any): WeatherAlertHistory {
        return new WeatherAlertHistory({
            id: prismaHistory.id,
            companyId: prismaHistory.companyId,
            condition: prismaHistory.condition,
            tempC: prismaHistory.tempC,
            tempF: prismaHistory.tempF,
            messagesSent: prismaHistory.messagesSent,
            sentAt: prismaHistory.sentAt,
            createdAt: prismaHistory.createdAt,
            updatedAt: prismaHistory.updatedAt,
            company: prismaHistory.company,
            messages: prismaHistory.messages,
        });
    }
}
