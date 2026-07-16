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

    async findAll(options?: PaginationDto & { companyId: string; rfvClassification?: string[] }): Promise<{ items: Customer[], total: number }> {
        const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc', id, startDate, endDate, name, companyId, rfvClassification } = options || {};

        const where: any = { companyId };

        if (id) where.id = id;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }

        if (rfvClassification && rfvClassification.length > 0) {
            const includesLead = rfvClassification.includes('lead');
            const rfvSegments = rfvClassification.filter((c) => c !== 'lead');

            if (includesLead && rfvSegments.length === 0) {
                where.orders = { none: {} };
            } else if (includesLead && rfvSegments.length > 0) {
                where.OR = [
                    { orders: { none: {} } },
                    {
                        orders: { some: {} },
                        rfvClassification: { in: rfvSegments },
                    },
                ];
            } else {
                where.rfvClassification = { in: rfvSegments };
                where.orders = { some: {} };
            }
        }

        const [items, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                orderBy: { [orderBy]: orderDirection },
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
