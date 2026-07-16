import { IRepository } from '../../common/database/repository.interface';
import { Coupon } from './coupon.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CouponFilterDto } from '../application/dto/coupon-filter.dto';

export interface ICouponRepository extends IRepository<Coupon> {
    findAllWithFilters(
        companyId: string,
        pagination: PaginationDto,
        filter: CouponFilterDto,
    ): Promise<{ items: Coupon[]; total: number }>;
    findByCompanyAndCode(companyId: string, code: string): Promise<Coupon | null>;
    toggleActive(id: string, companyId: string): Promise<Coupon>;
    softDelete(id: string): Promise<Coupon>;
    restore(id: string): Promise<Coupon>;
}
