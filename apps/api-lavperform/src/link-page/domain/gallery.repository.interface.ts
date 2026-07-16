import { IRepository } from '../../common/database/repository.interface';
import { Gallery } from './gallery.entity';

export interface IGalleryRepository extends IRepository<Gallery> {
    findByLinkPageId(linkPageId: string): Promise<Gallery[]>;
}
