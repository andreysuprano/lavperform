import { IRepository } from '../../common/database/repository.interface';
import { WeatherData } from './weather-data.entity';

export interface IWeatherDataRepository extends IRepository<WeatherData> {
    findByLocationKey(locationKey: string): Promise<WeatherData | null>;
    upsertByLocationKey(locationKey: string, data: Partial<WeatherData>): Promise<WeatherData>;
}
