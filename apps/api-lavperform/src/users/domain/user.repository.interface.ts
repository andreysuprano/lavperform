import { IRepository } from '../../common/database/repository.interface';
import { User } from './user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export interface IUserRepository extends IRepository<User> {
    findByEmail(email: string): Promise<User | null>;
    deleteUserCompanies(userId: string): Promise<void>;
    findAllWithFilters(pagination: PaginationDto): Promise<{ items: User[]; total: number }>;
}
