import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ICouponRepository } from '../domain/coupon.repository.interface';
import { Coupon } from '../domain/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponFilterDto } from './dto/coupon-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CouponsService {
    constructor(
        @Inject('ICouponRepository')
        private readonly couponRepository: ICouponRepository,
    ) {}

    async create(companyId: string, dto: CreateCouponDto): Promise<Coupon> {
        const validUntil = new Date(dto.validUntil);
        if (Number.isNaN(validUntil.getTime())) {
            throw new BadRequestException('Data de validade inválida');
        }

        const normalizedCode = dto.code.trim();
        if (!normalizedCode) {
            throw new BadRequestException('Código do cupom é obrigatório');
        }

        const existing = await this.couponRepository.findByCompanyAndCode(companyId, normalizedCode);
        if (existing) {
            throw new ConflictException('Já existe um cupom com este código para esta empresa');
        }

        return this.couponRepository.create({
            companyId,
            code: normalizedCode,
            description: dto.description ?? null,
            type: dto.type,
            unit: dto.unit,
            value: dto.value,
            validUntil,
            active: dto.active ?? true,
        });
    }

    async findAll(
        companyId: string,
        pagination: PaginationDto,
        filter: CouponFilterDto,
    ) {
        const { page = 1, limit = 10 } = pagination;
        const { items, total } = await this.couponRepository.findAllWithFilters(
            companyId,
            pagination,
            filter,
        );

        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / (limit || 10)),
            },
        };
    }

    async findOne(companyId: string, id: string): Promise<Coupon> {
        const coupon = await this.couponRepository.findById(id);
        if (!coupon || coupon.companyId !== companyId) {
            throw new NotFoundException('Cupom não encontrado');
        }
        return coupon;
    }

    async update(companyId: string, id: string, dto: UpdateCouponDto): Promise<Coupon> {
        await this.findOne(companyId, id);

        const data: Partial<Coupon> = {};

        if (dto.code !== undefined) {
            const normalizedCode = dto.code.trim();
            if (!normalizedCode) {
                throw new BadRequestException('Código do cupom não pode ser vazio');
            }
            const existing = await this.couponRepository.findByCompanyAndCode(companyId, normalizedCode);
            if (existing && existing.id !== id) {
                throw new ConflictException('Já existe outro cupom com este código para esta empresa');
            }
            data.code = normalizedCode;
        }

        if (dto.description !== undefined) data.description = dto.description;
        if (dto.type !== undefined) data.type = dto.type;
        if (dto.unit !== undefined) data.unit = dto.unit;
        if (dto.value !== undefined) data.value = dto.value;
        if (dto.active !== undefined) data.active = dto.active;

        if (dto.validUntil !== undefined) {
            const validUntil = new Date(dto.validUntil);
            if (Number.isNaN(validUntil.getTime())) {
                throw new BadRequestException('Data de validade inválida');
            }
            data.validUntil = validUntil;
        }

        return this.couponRepository.update(id, data);
    }

    async toggleActive(companyId: string, id: string): Promise<Coupon> {
        await this.findOne(companyId, id);
        return this.couponRepository.toggleActive(id, companyId);
    }

    async remove(companyId: string, id: string): Promise<Coupon> {
        await this.findOne(companyId, id);
        return this.couponRepository.softDelete(id);
    }

    async restore(companyId: string, id: string): Promise<Coupon> {
        const coupon = await this.couponRepository.findById(id);
        if (coupon && coupon.companyId !== companyId) {
            throw new NotFoundException('Cupom não encontrado');
        }
        return this.couponRepository.restore(id);
    }
}
