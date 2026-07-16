import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ICompanyRepository } from '../../domain/company.repository.interface';
import { Company } from '../../domain/company.entity';
import { CompanyMapper } from './mappers/company.mapper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CompanyStatus } from '@prisma/client';

@Injectable()
export class CompanyPrismaRepository implements ICompanyRepository {
    constructor(private readonly prisma: PrismaService) { }

    private notDeletedFilter = { deletedAt: null };

    async create(data: Partial<Company>): Promise<Company> {
        const created = await this.prisma.company.create({ data: data as any });
        return CompanyMapper.toDomain(created);
    }

    async createWithAddress(companyData: Partial<Company>, addressData: any): Promise<Company> {
        const address = await this.prisma.address.create({
            data: addressData
        });

        const created = await this.prisma.company.create({
            data: {
                ...companyData as any,
                addressId: address.id,
            },
            include: {
                address: true,
            },
        });

        return CompanyMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<Company[]> {
        const result = await this.prisma.company.findMany({
            where: { ...this.notDeletedFilter, ...options },
        });
        return result.map(CompanyMapper.toDomain);
    }

    async findAllWithFilters(paginationDto: PaginationDto): Promise<{ items: Company[]; total: number }> {
        const { page = 1, limit = 100, orderBy, orderDirection, id, startDate, endDate, name, state } = paginationDto;

        const where: any = { ...this.notDeletedFilter };
        if (id) where.id = id;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }

        if (state) {
            where.state = state;
        }

        const [items, total] = await Promise.all([
            this.prisma.company.findMany({
                where,
                orderBy: (orderBy && orderDirection) ? { [orderBy]: orderDirection } : undefined,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.company.count({ where }),
        ]);

        return {
            items: items.map(CompanyMapper.toDomain),
            total
        };
    }

    async findById(id: string): Promise<Company | null> {
        const result = await this.prisma.company.findFirst({
            where: { id, ...this.notDeletedFilter },
            include: { address: true }
        });
        return result ? CompanyMapper.toDomain(result) : null;
    }

    async findByIdWithRelations(id: string, relations: string[] = []): Promise<Company | null> {
        // Construct include object based on strings would be complex dynamically with types,
        // for now default useful includes or explicit ones if needed.
        // Or just expose specific methods.
        return this.findById(id); // Basic implementation for now
    }

    async findByCnpj(cnpj: string): Promise<Company | null> {
        const result = await this.prisma.company.findFirst({
            where: { cnpj, ...this.notDeletedFilter },
        });
        return result ? CompanyMapper.toDomain(result) : null;
    }

    async findBySlug(slug: string): Promise<Company | null> {
        const result = await this.prisma.company.findFirst({
            where: { slug, ...this.notDeletedFilter },
        });
        return result ? CompanyMapper.toDomain(result) : null;
    }

    async update(id: string, data: Partial<Company> & { address?: any }): Promise<Company> {
        const { address, ...companyData } = data;

        const updateData: any = { ...companyData };
        if (address) {
            updateData.address = {
                update: address
            }
        }

        const result = await this.prisma.company.update({
            where: { id },
            data: updateData,
            include: { address: true }
        });
        return CompanyMapper.toDomain(result);
    }

    async updateState(id: string, state: CompanyStatus): Promise<Company> {
        const result = await this.prisma.company.update({
            where: { id },
            data: { state },
        });
        return CompanyMapper.toDomain(result);
    }

    async updateAvatar(id: string, avatarUrl: string): Promise<Company> {
        const result = await this.prisma.company.update({
            where: { id },
            data: { avatarUrl },
        });
        return CompanyMapper.toDomain(result);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.company.delete({ where: { id } });
    }

    async softDelete(id: string): Promise<void> {
        const company = await this.prisma.company.findUnique({ where: { id } });

        if (!company || company.deletedAt) {
            return;
        }

        const deletedSuffix = `__deleted__${id}`;

        await this.prisma.company.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                state: CompanyStatus.INACTIVE,
                cnpj: `${company.cnpj}${deletedSuffix}`,
                slug: company.slug ? `${company.slug}${deletedSuffix}` : null,
            },
        });
    }

    async findOpeningHours(id: string): Promise<any[]> {
        return this.prisma.openingHours.findMany({
            where: { companyId: id },
            select: { dayOfWeek: true, openTime: true, closeTime: true, isOpen: true }
        });
    }

    async saveOpeningHours(id: string, openingHours: any[]): Promise<void> {
        await Promise.all(
            openingHours.map(async dto => {
                await this.prisma.openingHours.upsert({
                    where: { companyId_dayOfWeek: { companyId: id, dayOfWeek: dto.dayOfWeek } },
                    create: { ...dto, companyId: id },
                    update: { ...dto, companyId: id },
                });
            }));
    }

    async updateOpeningHours(id: string, openingHours: any[]): Promise<void> {
        await Promise.all(
            openingHours.map(async dto => {
                await this.prisma.openingHours.update({
                    where: { companyId_dayOfWeek: { companyId: id, dayOfWeek: dto.dayOfWeek } },
                    data: { ...dto, companyId: id },
                });
            }));
    }

    async listCompanyUsers(id: string): Promise<any[]> {
        const company = await this.prisma.company.findFirst({
            where: { id, ...this.notDeletedFilter },
            select: {
                userCompanies: {
                    select: {
                        user: {
                            select: { id: true, name: true, email: true, phone: true }
                        }
                    }
                }
            }
        });
        return company?.userCompanies?.map(uc => uc.user) || [];
    }

    async findWithSubscriptions(id: string): Promise<Company | null> {
        const result = await this.prisma.company.findFirst({
            where: { id, ...this.notDeletedFilter },
            include: {
                companySubscriptions: { include: { plan: true } }
            }
        });
        return result ? CompanyMapper.toDomain(result) : null;
    }

    async count(options?: any): Promise<number> {
        return this.prisma.company.count({
            where: { ...this.notDeletedFilter, ...options },
        });
    }

    async deleteAddress(addressId: string): Promise<void> {
        await this.prisma.address.delete({ where: { id: addressId } });
    }

    async findWithLinksAndMenu(slug: string): Promise<any> {
        return this.prisma.company.findFirst({
            select: {
                id: true,
                name: true,
                avatarUrl: true,
                address: true,
                phone: true,
                openingHours: {
                    omit: {
                        createdAt: true,
                        updatedAt: true,
                    }
                },
                linkPages: {
                    include: {
                        links: {
                            omit: {
                                createdAt: true,
                                updatedAt: true,
                            }
                        },
                        galleries: {
                            omit: {
                                createdAt: true,
                                updatedAt: true,
                            }
                        },
                    },
                    omit: {
                        createdAt: true,
                        updatedAt: true,
                    }
                },
                digitalMenuIntegration: {
                    select: {
                        digitalMenuUrl: true,
                        partner: {
                            select: {
                                name: true,
                                logoUrl: true,
                            },
                        },
                    }
                },
            },
            where: { slug, ...this.notDeletedFilter },
        });
    }
}
