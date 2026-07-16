import { WeatherAlert as PrismaWeatherAlert } from '@prisma/client';
import { WeatherAlert } from '../../../domain/weather-alert.entity';

export class WeatherAlertMapper {
    static toDomain(prismaWeatherAlert: any): WeatherAlert {
        return new WeatherAlert({
            id: prismaWeatherAlert.id,
            companyId: prismaWeatherAlert.companyId,
            condition: prismaWeatherAlert.condition,
            daysOfWeek: prismaWeatherAlert.daysOfWeek,
            dailyAlerts: prismaWeatherAlert.dailyAlerts,
            giftId: prismaWeatherAlert.giftId,
            messages: prismaWeatherAlert.messages ?? undefined,
            active: prismaWeatherAlert.active,
            createdAt: prismaWeatherAlert.createdAt,
            updatedAt: prismaWeatherAlert.updatedAt,
            company: prismaWeatherAlert.company,
        });
    }
}
