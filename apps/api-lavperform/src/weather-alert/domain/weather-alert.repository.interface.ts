import { IRepository } from '../../common/database/repository.interface';
import { WeatherAlert } from './weather-alert.entity';

export interface IWeatherAlertRepository extends IRepository<WeatherAlert> {
    findByCompanyId(companyId: string): Promise<WeatherAlert | null>;
    findActiveByCompanyId(companyId: string): Promise<WeatherAlert | null>;
}
