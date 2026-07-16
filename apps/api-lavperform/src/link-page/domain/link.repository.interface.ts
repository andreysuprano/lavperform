import { IRepository } from '../../common/database/repository.interface';
import { Link } from './link.entity';

export interface ILinkRepository extends IRepository<Link> {
    findByLinkPageId(linkPageId: string): Promise<Link[]>;
}
