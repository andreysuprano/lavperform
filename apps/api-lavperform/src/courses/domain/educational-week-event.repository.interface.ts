import { IRepository } from '../../common/database/repository.interface';
import { EducationalWeekEvent } from './educational-week-event.entity';

export interface IEducationalWeekEventRepository extends IRepository<EducationalWeekEvent> {
    findByCurrentWeek(): Promise<EducationalWeekEvent[]>;
}
