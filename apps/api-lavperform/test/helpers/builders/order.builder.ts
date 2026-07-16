import { PrismaClient, Order, Company, Customer, Prisma } from '@prisma/client';
import { CompanyBuilder } from './company.builder';
import { CustomerBuilder } from './customer.builder';

/**
 * Builder for creating Order test data
 */
export class OrderBuilder {
  private displayId = Math.floor(Math.random() * 10000);
  private merchantId = Math.floor(Math.random() * 100000);
  private status = 'CONFIRMED';
  private orderType = 'DELIVERY';
  private orderTiming = 'IMMEDIATE';
  private salesChannel = 'IFOOD';
  private deliveryFee = new Prisma.Decimal(5.0);
  private serviceFee = new Prisma.Decimal(0.0);
  private additionalFee = new Prisma.Decimal(0.0);
  private total = new Prisma.Decimal(50.0);
  private createdAt = new Date();
  private updatedAt = new Date();
  private company?: Company;
  private customer?: Customer;
  private integratorOrderId?: number;
  private customerOrigin?: string;
  private observation?: string;

  /**
   * Sets the order display ID
   */
  withDisplayId(id: number): this {
    this.displayId = id;
    return this;
  }

  /**
   * Sets the order merchant ID
   */
  withMerchantId(id: number): this {
    this.merchantId = id;
    return this;
  }

  /**
   * Sets the order status
   */
  withStatus(status: string): this {
    this.status = status;
    return this;
  }

  /**
   * Sets the order type
   */
  withOrderType(type: string): this {
    this.orderType = type;
    return this;
  }

  /**
   * Sets the sales channel
   */
  withSalesChannel(channel: string): this {
    this.salesChannel = channel;
    return this;
  }

  /**
   * Sets the order total
   */
  withTotal(total: number): this {
    this.total = new Prisma.Decimal(total);
    return this;
  }

  /**
   * Sets the delivery fee
   */
  withDeliveryFee(fee: number): this {
    this.deliveryFee = new Prisma.Decimal(fee);
    return this;
  }

  /**
   * Sets the service fee
   */
  withServiceFee(fee: number): this {
    this.serviceFee = new Prisma.Decimal(fee);
    return this;
  }

  /**
   * Associates the order with a company
   */
  withCompany(company: Company): this {
    this.company = company;
    return this;
  }

  /**
   * Associates the order with a customer
   */
  withCustomer(customer: Customer): this {
    this.customer = customer;
    return this;
  }

  /**
   * Sets the order observation
   */
  withObservation(observation: string): this {
    this.observation = observation;
    return this;
  }

  /**
   * Sets the order created at date
   */
  withCreatedAt(date: Date): this {
    this.createdAt = date;
    return this;
  }

  /**
   * Builds and persists the order to the database
   */
  async build(prisma: PrismaClient): Promise<Order> {
    // Create or use existing company
    if (!this.company) {
      this.company = await new CompanyBuilder().build(prisma);
    }

    // Create or use existing customer
    if (!this.customer) {
      this.customer = await new CustomerBuilder()
        .withCompany(this.company)
        .build(prisma);
    }

    return prisma.order.create({
      data: {
        displayId: this.displayId,
        merchantId: this.merchantId,
        status: this.status,
        orderType: this.orderType,
        orderTiming: this.orderTiming,
        salesChannel: this.salesChannel,
        deliveryFee: this.deliveryFee,
        serviceFee: this.serviceFee,
        additionalFee: this.additionalFee,
        total: this.total,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        companyId: this.company.id,
        customerId: this.customer.id,
        integratorOrderId: this.integratorOrderId,
        customerOrigin: this.customerOrigin,
        observation: this.observation,
      },
    });
  }
}
