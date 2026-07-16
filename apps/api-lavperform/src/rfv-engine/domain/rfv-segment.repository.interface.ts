import { IRepository } from '../../common/database/repository.interface';
import { RfvSegment } from './rfv-segment.entity';

export interface IRfvSegmentRepository extends IRepository<RfvSegment> {
    findByCustomerId(customerId: string): Promise<RfvSegment[]>;
    findLatestByCustomerId(customerId: string): Promise<RfvSegment | null>;
    findBySegment(segment: string, companyId: string): Promise<RfvSegment[]>;
    countBySegment(companyId: string): Promise<Array<{ segment: string; count: number }>>;
}
