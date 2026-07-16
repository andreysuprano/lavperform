import { IRepository } from '../../common/database/repository.interface';
import { Plan } from './plan.entity';

export interface IPlanRepository extends IRepository<Plan> {
    findActive(): Promise<Plan[]>;
    findById(id: string): Promise<Plan | null>;
    findSelfCheckoutPlan(): Promise<Plan | null>;
    setSelfCheckoutPlan(id: string): Promise<Plan>;
}
