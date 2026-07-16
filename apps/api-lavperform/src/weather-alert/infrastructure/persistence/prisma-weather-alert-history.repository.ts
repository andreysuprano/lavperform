import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IWeatherAlertHistoryRepository } from '../../domain/weather-alert-history.repository.interface';
import { WeatherAlertHistory } from '../../domain/weather-alert-history.entity';
import { WeatherAlertHistoryMapper } from './mappers/weather-alert-history.mapper';

@Injectable()
export class WeatherAlertHistoryPrismaRepository implements IWeatherAlertHistoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<WeatherAlertHistory>): Promise<WeatherAlertHistory> {
        const created = await this.prisma.weatherAlertHistory.create({
            data: data as any,
        });
        return WeatherAlertHistoryMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<WeatherAlertHistory[]> {
        const histories = await this.prisma.weatherAlertHistory.findMany(options);
        return histories.map(WeatherAlertHistoryMapper.toDomain);
    }

    async findById(id: string): Promise<WeatherAlertHistory | null> {
        const history = await this.prisma.weatherAlertHistory.findUnique({
            where: { id },
        });
        return history ? WeatherAlertHistoryMapper.toDomain(history) : null;
    }

    async findByCompanyId(companyId: string): Promise<WeatherAlertHistory[]> {
        const histories = await this.prisma.weatherAlertHistory.findMany({
            where: { companyId },
            orderBy: { sentAt: 'desc' },
        });
        return histories.map(WeatherAlertHistoryMapper.toDomain);
    }

    async findTodayByCompanyId(companyId: string): Promise<WeatherAlertHistory | null> {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const history = await this.prisma.weatherAlertHistory.findFirst({
            where: {
                companyId,
                sentAt: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            orderBy: { sentAt: 'desc' },
        });

        return history ? WeatherAlertHistoryMapper.toDomain(history) : null;
    }

    async update(id: string, data: Partial<WeatherAlertHistory>): Promise<WeatherAlertHistory> {
        const updated = await this.prisma.weatherAlertHistory.update({
            where: { id },
            data: data as any,
        });
        return WeatherAlertHistoryMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.weatherAlertHistory.delete({
            where: { id },
        });
    }
}
