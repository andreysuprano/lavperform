import { Customer } from '../../customers/domain/customer.entity';

export class Order {
    id: string;
    integratorOrderId?: number | null;
    externalOrderId?: string | null;
    displayId: number;
    merchantId: number;
    status: string;
    orderType: string;
    orderTiming: string;
    salesChannel: string;
    customerOrigin?: string | null;
    tableNumber?: string | null;
    estimatedTime?: number | null;
    cancellationReason?: string | null;
    fiscalDocument?: string | null;
    observation?: string | null;
    deliveryFee: number;
    serviceFee: number;
    additionalFee: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
    companyId: string;
    customerId: string;
    customer?: Customer;
    digitalMenuIntegrationId?: string | null;
    deliveryAddress?: OrderDeliveryAddress | null;
    schedule?: OrderSchedule | null;
    items: OrderItem[];
    discounts: OrderDiscount[];
    payments: OrderPayment[];

    constructor(partial: Partial<Order>) {
        Object.assign(this, partial);
    }
}

export class OrderDeliveryAddress {
    id: string;
    orderId: string;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    reference?: string | null;

    constructor(partial: Partial<OrderDeliveryAddress>) {
        Object.assign(this, partial);
    }
}

export class OrderSchedule {
    id: string;
    orderId: string;
    deliveryDateRaw: string;
    deliveryTimeRaw: string;
    deliveryAt?: Date | null;

    constructor(partial: Partial<OrderSchedule>) {
        Object.assign(this, partial);
    }
}

export class OrderItem {
    id: string;
    orderId: string;
    itemId: number;
    externalCode?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    kind: string;
    status: string;
    observation?: string | null;
    parentItemId?: string | null;

    options: OrderOption[];
    items?: OrderItem[]; // Nested items (children)

    constructor(partial: Partial<OrderItem>) {
        Object.assign(this, partial);
    }
}

export class OrderOption {
    id: string;
    orderItemId: string;
    optionId: number;
    externalCode?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    optionGroupId: number;
    optionGroupName: string;

    constructor(partial: Partial<OrderOption>) {
        Object.assign(this, partial);
    }
}

export class OrderDiscount {
    id: string;
    orderId: string;
    type: string;
    value: number;
    description?: string | null;

    constructor(partial: Partial<OrderDiscount>) {
        Object.assign(this, partial);
    }
}

export class OrderPayment {
    id: string;
    orderId: string;
    total: number;
    paymentType: string;
    changeFor?: number | null;
    status: string;
    paymentMethod: string;
    cardNumber?: string | null;
    cardBrand?: string | null;
    observation?: string | null;
    paymentFee: number;

    constructor(partial: Partial<OrderPayment>) {
        Object.assign(this, partial);
    }
}
