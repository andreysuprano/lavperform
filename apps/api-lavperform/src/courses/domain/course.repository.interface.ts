import { IRepository } from '../../common/database/repository.interface';
import { Course } from './course.entity';

export interface ICourseRepository extends IRepository<Course> {
    findByIdWithModules(id: string): Promise<Course | null>;
}
