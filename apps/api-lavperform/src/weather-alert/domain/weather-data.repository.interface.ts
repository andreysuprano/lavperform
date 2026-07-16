import { IRepository } from '../../common/database/repository.interface';
import { WeatherData } from './weather-data.entity';

export interface IWeatherDataRepository extends IRepository<WeatherData> {
    findByCityName(cityName: string): Promise<WeatherData | null>;
    upsertByCityName(cityName: string, data: Partial<WeatherData>): Promise<WeatherData>;
}
