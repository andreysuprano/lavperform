import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICustomerRepository } from '../../domain/customer.repository.interface';
import { Customer } from '../../domain/customer.entity';
import { CustomerMapper } from './mappers/customer.mapper';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { OrderMapper } from 'src/orders/infrastructure/persistence/mappers/order.mapper';
import { Order } from 'src/orders/domain/order.entity';
import { Message, MessageStatus } from '@prisma/client';

@Injectable()
export class CustomerPrismaRepository implements ICustomerRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Customer>): Promise<Customer> {
        const { address, ...customerData } = data as any;

        const created = await this.prisma.customer.create({
            data: customerData,
            include: { address: true }
        });
        return CustomerMapper.toDomain(created);
    }

    async createWithAddress(data: Partial<Customer>, addressData: any): Promise<Customer> {
        const { address, ...customerData } = data as any;

        const created = await this.prisma.$transaction(async (tx) => {
            // Primeiro cria o Address
            const newAddress = await tx.address.create({
                data: {
                    street: addressData.street,
                    number: addressData.number,
                    complement: addressData.complement,
                    neighborhood: addressData.neighborhood,
                    city: addressData.city,
                    state: addressData.state,
                    zipCode: addressData.zipCode,
                }
            });

            // Depois cria o Customer com o addressId
            return tx.customer.create({
                data: {
                    ...customerData,
                    addressId: newAddress.id,
                },
                include: { address: true }
            });
        });

        return CustomerMapper.toDomain(created);
    }

    async update(id: string, data: Partial<Customer>): Promise<Customer> {
        const { address, ...customerData } = data as any;

        const updated = await this.prisma.customer.update({
            where: { id },
            data: customerData,
            include: { address: true }
        });
        return CustomerMapper.toDomain(updated);
    }

    async updateWithAddress(id: string, data: Partial<Customer>, addressData: any): Promise<Customer> {
        const { address, ...customerData } = data as any;

        const updated = await this.prisma.$transaction(async (tx) => {
            // Busca o customer atual para verificar se já tem endereço
            const currentCustomer = await tx.customer.findUnique({
                where: { id },
                select: { addressId: true }
            });

            let addressId = currentCustomer?.addressId;

            if (addressId) {
                // Atualiza o endereço existente
                await tx.address.update({
                    where: { id: addressId },
                    data: addressData
                });
            } else {
                // Cria um novo endereço
                const newAddress = await tx.address.create({
                    data: addressData
                });
                addressId = newAddress.id;
            }

            // Atualiza o customer com o addressId
            return tx.customer.update({
                where: { id },
                data: {
                    ...customerData,
                    addressId,
                },
                include: { address: true }
            });
        });

        return CustomerMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.customer.delete({ where: { id } });
    }

    async deleteWithAddress(id: string, addressId: string): Promise<Customer> {
        const result = await this.prisma.$transaction(async (prisma) => {
            const deletedCustomer = await prisma.customer.delete({
                where: { id },
            });

            if (addressId) {
                await prisma.address.delete({
                    where: { id: addressId },
                });
            }
            return deletedCustomer;
        });

        return CustomerMapper.toDomain(result as any);
    }

    async findById(id: string): Promise<Customer | null> {
        const result = await this.prisma.customer.findUnique({
            where: { id },
            include: { address: true }
        });
        return result ? CustomerMapper.toDomain(result) : null;
    }

    async findByPhone(companyId: string, phone: string): Promise<Customer | null> {
        const result = await this.prisma.customer.findFirst({
            where: { companyId, phone },
            include: { address: true }
        });
        return result ? CustomerMapper.toDomain(result) : null;
    }

    async findByCpf(companyId: string, cpf: string): Promise<Customer | null> {
        const result = await this.prisma.customer.findFirst({
            where: { companyId, cpf },
            include: { address: true }
        });
        return result ? CustomerMapper.toDomain(result) : null;
    }

    async findAll(options?: PaginationDto & {
        companyId: string;
        rfvClassification?: string[];
        hasEmail?: boolean;
        hasBirthDate?: boolean;
        whatsappOptin?: boolean;
        whatsappVerified?: boolean;
        hasOrders?: boolean;
    }): Promise<{ items: Customer[], total: number }> {
        const {
            page = 1,
            limit = 10,
            orderBy = 'createdAt',
            orderDirection = 'desc',
            id,
            startDate,
            endDate,
            name,
            companyId,
            rfvClassification,
            hasEmail,
            hasBirthDate,
            whatsappOptin,
            whatsappVerified,
            hasOrders,
        } = options || {};

        const where: any = { companyId };
        const andFilters: any[] = [];

        if (id) where.id = id;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        if (name) {
            andFilters.push({
                OR: [
                    { name: { contains: name, mode: 'insensitive' } },
                    { phone: { contains: name, mode: 'insensitive' } },
                    { email: { contains: name, mode: 'insensitive' } },
                ],
            });
        }

        if (rfvClassification && rfvClassification.length > 0) {
            const includesLead = rfvClassification.includes('lead');
            const rfvSegments = rfvClassification.filter((c) => c !== 'lead');

            if (includesLead && rfvSegments.length === 0) {
                andFilters.push({ orders: { none: {} } });
            } else if (includesLead && rfvSegments.length > 0) {
                andFilters.push({
                    OR: [
                        { orders: { none: {} } },
                        {
                            orders: { some: {} },
                            rfvClassification: { in: rfvSegments },
                        },
                    ],
                });
            } else {
                andFilters.push({
                    rfvClassification: { in: rfvSegments },
                    orders: { some: {} },
                });
            }
        }

        if (hasEmail === true) {
            andFilters.push({
                email: { not: null },
                NOT: { email: '' },
            });
        } else if (hasEmail === false) {
            andFilters.push({
                OR: [{ email: null }, { email: '' }],
            });
        }

        if (hasBirthDate === true) {
            andFilters.push({ birthDate: { not: null } });
        } else if (hasBirthDate === false) {
            andFilters.push({ birthDate: null });
        }

        if (typeof whatsappOptin === 'boolean') {
            andFilters.push({ whatsappOptin });
        }

        if (typeof whatsappVerified === 'boolean') {
            andFilters.push({ whatsappVerified });
        }

        if (hasOrders === true) {
            andFilters.push({ orders: { some: {} } });
        } else if (hasOrders === false) {
            andFilters.push({ orders: { none: {} } });
        }

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        const allowedOrderBy = new Set([
            'createdAt',
            'name',
            'lastOrderDate',
            'averageTicket',
            'updatedAt',
        ]);
        const safeOrderBy = allowedOrderBy.has(orderBy) ? orderBy : 'createdAt';

        const [items, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                orderBy: { [safeOrderBy]: orderDirection },
                skip: (page - 1) * limit,
                take: limit,
                include: { address: true },
            }),
            this.prisma.customer.count({ where }),
        ]);

        return {
            items: items.map(CustomerMapper.toDomain),
            total
        };
    }

    async count(options?: any): Promise<number> {
        return this.prisma.customer.count({ where: options });
    }

    async countByCompany(companyId: string): Promise<number> {
        return this.prisma.customer.count({
            where: { companyId },
        });
    }

    async countByCompanyAndRfv(companyId: string, rfv: string[]): Promise<number> {
        return this.prisma.customer.count({
            where: {
                companyId,
                rfvClassification: {
                    in: rfv,
                },
            },
        });
    }

    async countByCompanyAndWhatsappVerified(companyId: string, verified: boolean): Promise<number> {
        return this.prisma.customer.count({
            where: {
                companyId,
                whatsappVerified: verified,
            },
        });
    }

    async countLeadsByCompany(companyId: string): Promise<number> {
        return this.prisma.customer.count({
            where: {
                companyId,
                orders: { none: {} },
            },
        });
    }

    async totalCustomersBySegmentation(companyId: string): Promise<any[]> {
        const counts = await this.prisma.customer.groupBy({
            by: ['rfvClassification'],
            where: {
                companyId,
                orders: { some: {} },
            },
            _count: { _all: true }
        });

        return counts;
    }

    async getLifeTimeValueByCustomer(customerId: string): Promise<number> {
        const result = await this.prisma.order.aggregate({
            where: { customerId  },
            _sum: { total: true }
        })
        return Number(result._sum.total || 0);
    }

    async getTotalOrdersByCustomer(customerId: string): Promise<number> {
        const result = await this.prisma.order.count({
            where: { customerId }
        });
        return Number(result);
    }

    async getLastOrdersByCustomer(customerId: string): Promise<Order[]> {
        const result = await this.prisma.order.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                items: true,
                discounts: true,
                payments: true,
            }
        });
        return result.map(OrderMapper.toDomain);
    }

    async getLastMessagesSentToCustomer(
        customerId: string,
        pagination?: PaginationDto
    ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 10;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { customerId },
                orderBy: { scheduledDate: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.message.count({
                where: { customerId }
            })
        ]);
        return {
            data,
            total,
            page,
            limit,
        };
    }

    async findTopBuyers(
        companyId: string,
        limit = 10,
        sortBy: 'totalSpent' | 'orderCount' = 'totalSpent',
    ) {
        const take = Math.min(Math.max(limit, 1), 50);

        // groupBy + orderBy por _count no Prisma pode não aplicar a ordenação
        // corretamente em alguns casos; ordenamos em memória para garantir.
        const grouped = await this.prisma.order.groupBy({
            by: ['customerId'],
            where: { companyId },
            _sum: { total: true },
            _count: { _all: true },
        });

        if (grouped.length === 0) {
            return [];
        }

        const ranked = [...grouped].sort((a, b) => {
            const aSpent = Number(a._sum?.total || 0);
            const bSpent = Number(b._sum?.total || 0);
            const aOrders = Number(a._count?._all || 0);
            const bOrders = Number(b._count?._all || 0);

            if (sortBy === 'orderCount') {
                if (bOrders !== aOrders) return bOrders - aOrders;
                return bSpent - aSpent;
            }

            if (bSpent !== aSpent) return bSpent - aSpent;
            return bOrders - aOrders;
        }).slice(0, take);

        const customerIds = ranked.map((row) => row.customerId);

        const customers = await this.prisma.customer.findMany({
            where: {
                companyId,
                id: { in: customerIds },
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                rfvClassification: true,
                averageTicket: true,
                lastOrderDate: true,
                companyId: true,
                whatsappOptin: true,
                createdAt: true,
                updatedAt: true,
                birthDate: true,
            },
        });

        const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

        return ranked
            .map((row) => {
                const customer = customerMap.get(row.customerId);
                if (!customer) return null;

                const totalSpent = Number(row._sum?.total || 0);
                const orderCount = Number(row._count?._all || 0);
                const averageTicket =
                    orderCount > 0
                        ? totalSpent / orderCount
                        : Number(customer.averageTicket || 0);

                return {
                    customerId: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    rfvClassification: customer.rfvClassification,
                    averageTicket,
                    lastOrderDate: customer.lastOrderDate,
                    totalSpent,
                    orderCount,
                    companyId: customer.companyId,
                    whatsappOptin: customer.whatsappOptin,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                    birthDate: customer.birthDate,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    async findWhatsappValidationCandidates(
        companyId: string,
        skip: number,
        take: number,
    ): Promise<Array<{ id: string; phone: string; companyId: string }>> {
        const rows = await this.prisma.customer.findMany({
            where: {
                companyId,
                phone: { not: null },
                NOT: {
                    phone: {
                        startsWith: 'cpf:',
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            skip,
            take,
            select: {
                id: true,
                phone: true,
                companyId: true,
            },
        });

        return rows.filter(
            (row): row is { id: string; phone: string; companyId: string } =>
                typeof row.phone === 'string' && row.phone.length > 0,
        );
    }
}
