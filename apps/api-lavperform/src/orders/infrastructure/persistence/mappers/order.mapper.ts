import {
    Order as PrismaOrder,
    OrderItem as PrismaOrderItem,
    OrderDeliveryAddress as PrismaOrderDeliveryAddress,
    OrderSchedule as PrismaOrderSchedule,
    OrderDiscount as PrismaOrderDiscount,
    OrderPayment as PrismaOrderPayment,
    OrderOption as PrismaOrderOption,
    Customer as PrismaCustomer,
    Address as PrismaAddress
} from '@prisma/client';
import {
    Order,
    OrderItem,
    OrderDeliveryAddress,
    OrderSchedule,
    OrderDiscount,
    OrderPayment,
    OrderOption
} from '../../../domain/order.entity';
import { CustomerMapper } from '../../../../customers/infrastructure/persistence/mappers/customer.mapper';

type PrismaOrderWithRelations = PrismaOrder & {
    items?: (PrismaOrderItem & { options?: PrismaOrderOption[], items?: PrismaOrderItem[] })[];
    deliveryAddress?: PrismaOrderDeliveryAddress | null;
    schedule?: PrismaOrderSchedule | null;
    discounts?: PrismaOrderDiscount[];
    payments?: PrismaOrderPayment[];
    customer?: PrismaCustomer & { address?: PrismaAddress | null };
};

export class OrderMapper {
    static toDomain(prismaOrder: PrismaOrderWithRelations): Order {
        const entity = new Order({
            ...prismaOrder as any,
            deliveryFee: Number(prismaOrder.deliveryFee),
            serviceFee: Number(prismaOrder.serviceFee),
            additionalFee: Number(prismaOrder.additionalFee),
            total: Number(prismaOrder.total),
        });

        if (prismaOrder.items) {
            entity.items = prismaOrder.items.map(item => OrderMapper.toDomainItem(item));
        }

        if (prismaOrder.deliveryAddress) {
            entity.deliveryAddress = new OrderDeliveryAddress(prismaOrder.deliveryAddress);
        }

        if (prismaOrder.schedule) {
            entity.schedule = new OrderSchedule(prismaOrder.schedule);
        }

        if (prismaOrder.discounts) {
            entity.discounts = prismaOrder.discounts.map(d => new OrderDiscount({
                ...d,
                value: Number(d.value)
            }));
        }

        if (prismaOrder.payments) {
            entity.payments = prismaOrder.payments.map(p => new OrderPayment({
                ...p,
                total: Number(p.total),
                changeFor: p.changeFor ? Number(p.changeFor) : null,
                paymentFee: Number(p.paymentFee)
            }));
        }

        if (prismaOrder.customer) {
            entity.customer = CustomerMapper.toDomain(prismaOrder.customer);
        }

        return entity;
    }

    private static toDomainItem(prismaItem: PrismaOrderItem & { options?: PrismaOrderOption[], items?: PrismaOrderItem[] }): OrderItem {
        const item = new OrderItem({
            ...prismaItem as any,
            unitPrice: Number(prismaItem.unitPrice),
            totalPrice: Number(prismaItem.totalPrice),
        });

        if (prismaItem.options) {
            item.options = prismaItem.options.map(opt => new OrderOption({
                ...opt,
                unitPrice: Number(opt.unitPrice)
            }));
        }

        if (prismaItem.items) {
            // Handle nested items recursively if Prisma supports it in the type, otherwise this might be tricky to type strictly without recursion definition
            // For now assuming 1 level of nesting as per typical service usage, or recursion if type allows
            item.items = prismaItem.items.map(child => OrderMapper.toDomainItem(child));
        }

        return item;
    }
}
