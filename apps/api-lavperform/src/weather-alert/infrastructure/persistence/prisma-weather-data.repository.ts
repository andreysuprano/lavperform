import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IWeatherDataRepository } from '../../domain/weather-data.repository.interface';
import { WeatherData } from '../../domain/weather-data.entity';
import { WeatherDataMapper } from './mappers/weather-data.mapper';

@Injectable()
export class WeatherDataPrismaRepository implements IWeatherDataRepository {
    private readonly logger = new Logger(WeatherDataPrismaRepository.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<WeatherData>): Promise<WeatherData> {
        const created = await this.prisma.weatherData.create({
            data: data as any,
        });
        return WeatherDataMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<WeatherData[]> {
        const weatherData = await this.prisma.weatherData.findMany(options);
        return weatherData.map(WeatherDataMapper.toDomain);
    }

    async findById(id: string): Promise<WeatherData | null> {
        const weatherData = await this.prisma.weatherData.findUnique({
            where: { id },
        });
        return weatherData ? WeatherDataMapper.toDomain(weatherData) : null;
    }

    async findByCityName(cityName: string): Promise<WeatherData | null> {
        const weatherData = await this.prisma.weatherData.findUnique({
            where: { cityName },
        });
        return weatherData ? WeatherDataMapper.toDomain(weatherData) : null;
    }

    async upsertByCityName(cityName: string, data: Partial<WeatherData>): Promise<WeatherData> {
        this.logger.debug(`Upsert para cidade: ${cityName} - Temp: ${data.tempC}°C`);
        
        const upserted = await this.prisma.weatherData.upsert({
            where: { cityName },
            update: data as any,
            create: { cityName, ...data } as any,
        });
        
        this.logger.debug(`Upsert concluído para ${cityName} - ID: ${upserted.id}`);
        return WeatherDataMapper.toDomain(upserted);
    }

    async update(id: string, data: Partial<WeatherData>): Promise<WeatherData> {
        const updated = await this.prisma.weatherData.update({
            where: { id },
            data: data as any,
        });
        return WeatherDataMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.weatherData.delete({
            where: { id },
        });
    }
}
