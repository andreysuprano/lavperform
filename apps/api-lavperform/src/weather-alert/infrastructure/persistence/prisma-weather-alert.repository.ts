import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IWeatherAlertRepository } from '../../domain/weather-alert.repository.interface';
import { WeatherAlert } from '../../domain/weather-alert.entity';
import { WeatherAlertMapper } from './mappers/weather-alert.mapper';

@Injectable()
export class WeatherAlertPrismaRepository implements IWeatherAlertRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<WeatherAlert>): Promise<WeatherAlert> {
        const created = await this.prisma.weatherAlert.create({
            data: data as any,
        });
        return WeatherAlertMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<WeatherAlert[]> {
        const weatherAlerts = await this.prisma.weatherAlert.findMany(options);
        return weatherAlerts.map(WeatherAlertMapper.toDomain);
    }

    async findById(id: string): Promise<WeatherAlert | null> {
        const weatherAlert = await this.prisma.weatherAlert.findUnique({
            where: { id },
        });
        return weatherAlert ? WeatherAlertMapper.toDomain(weatherAlert) : null;
    }

    async findByCompanyId(companyId: string): Promise<WeatherAlert | null> {
        const weatherAlert = await this.prisma.weatherAlert.findUnique({
            where: { companyId },
            include: {
                company: true,
            },
        });
        return weatherAlert ? WeatherAlertMapper.toDomain(weatherAlert) : null;
    }

    async findActiveByCompanyId(companyId: string): Promise<WeatherAlert | null> {
        const weatherAlert = await this.prisma.weatherAlert.findFirst({
            where: {
                companyId,
                active: true,
            },
            include: {
                company: true,
            },
        });
        return weatherAlert ? WeatherAlertMapper.toDomain(weatherAlert) : null;
    }

    async update(id: string, data: Partial<WeatherAlert>): Promise<WeatherAlert> {
        const updated = await this.prisma.weatherAlert.update({
            where: { id },
            data: data as any,
        });
        return WeatherAlertMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.weatherAlert.delete({
            where: { id },
        });
    }
}
