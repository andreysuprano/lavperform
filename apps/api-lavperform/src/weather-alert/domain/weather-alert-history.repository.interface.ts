import { IRepository } from '../../common/database/repository.interface';
import { WeatherAlertHistory } from './weather-alert-history.entity';

export interface IWeatherAlertHistoryRepository extends IRepository<WeatherAlertHistory> {
    findByCompanyId(companyId: string): Promise<WeatherAlertHistory[]>;
    findTodayByCompanyId(companyId: string): Promise<WeatherAlertHistory | null>;
}
