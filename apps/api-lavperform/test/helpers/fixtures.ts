import { PrismaClient, User, Company, Campaign, Customer, Order } from '@prisma/client';
import { UserBuilder } from './builders/user.builder';
import { CompanyBuilder } from './builders/company.builder';
import { CampaignBuilder } from './builders/campaign.builder';
import { CustomerBuilder } from './builders/customer.builder';
import { OrderBuilder } from './builders/order.builder';
import { generateAuthTokenFromEntities } from './auth.helper';

/**
 * Test fixtures for common scenarios
 * Provides high-level methods to create complete test data sets
 */
export class TestFixtures {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a company with ACTIVE status
   */
  async companyWithActiveStatus(): Promise<Company> {
    return new CompanyBuilder().withState('ACTIVE').build(this.prisma);
  }

  /**
   * Creates a company with PENDING status
   */
  async companyWithPendingStatus(): Promise<Company> {
    return new CompanyBuilder().withState('PENDING').build(this.prisma);
  }

  /**
   * Creates an authenticated user with company and returns user, company, and token
   */
  async authenticatedUser(accessRules: Array<{ module: string; action: string }> = []): Promise<{
    user: User;
    company: Company;
    token: string;
  }> {
    const company = await new CompanyBuilder().withState('ACTIVE').build(this.prisma);
    const user = await new UserBuilder()
      .withCompany(company)
      .withAccessRules(accessRules)
      .build(this.prisma);

    const token = generateAuthTokenFromEntities(user, company, accessRules);

    return { user, company, token };
  }

  /**
   * Creates a complete campaign setup (company, campaign)
   */
  async campaignScenario(): Promise<{
    company: Company;
    campaign: Campaign;
  }> {
    const company = await new CompanyBuilder().withState('ACTIVE').build(this.prisma);
    const campaign = await new CampaignBuilder()
      .withCompany(company)
      .build(this.prisma);

    return { company, campaign };
  }

  /**
   * Creates a complete order scenario (company, customer, order)
   */
  async orderScenario(): Promise<{
    company: Company;
    customer: Customer;
    order: Order;
  }> {
    const company = await new CompanyBuilder().withState('ACTIVE').build(this.prisma);
    const customer = await new CustomerBuilder()
      .withCompany(company)
      .build(this.prisma);
    const order = await new OrderBuilder()
      .withCompany(company)
      .withCustomer(customer)
      .build(this.prisma);

    return { company, customer, order };
  }

  /**
   * Creates a company with multiple customers
   */
  async companyWithCustomers(customerCount: number = 3): Promise<{
    company: Company;
    customers: Customer[];
  }> {
    const company = await new CompanyBuilder().withState('ACTIVE').build(this.prisma);
    const customers: Customer[] = [];

    for (let i = 0; i < customerCount; i++) {
      const customer = await new CustomerBuilder()
        .withCompany(company)
        .withName(`Customer ${i + 1}`)
        .build(this.prisma);
      customers.push(customer);
    }

    return { company, customers };
  }

  /**
   * Creates a complete authenticated scenario with user, company, and multiple orders
   */
  async authenticatedUserWithOrders(orderCount: number = 5): Promise<{
    user: User;
    company: Company;
    token: string;
    customers: Customer[];
    orders: Order[];
  }> {
    const { user, company, token } = await this.authenticatedUser();
    const customers: Customer[] = [];
    const orders: Order[] = [];

    for (let i = 0; i < orderCount; i++) {
      const customer = await new CustomerBuilder()
        .withCompany(company)
        .withName(`Customer ${i + 1}`)
        .build(this.prisma);
      customers.push(customer);

      const order = await new OrderBuilder()
        .withCompany(company)
        .withCustomer(customer)
        .withDisplayId(1000 + i)
        .build(this.prisma);
      orders.push(order);
    }

    return { user, company, token, customers, orders };
  }

  /**
   * Creates a complete authenticated scenario with user, company, and multiple campaigns
   */
  async authenticatedUserWithCampaigns(campaignCount: number = 3): Promise<{
    user: User;
    company: Company;
    token: string;
    campaigns: Campaign[];
  }> {
    const { user, company, token } = await this.authenticatedUser();
    const campaigns: Campaign[] = [];

    for (let i = 0; i < campaignCount; i++) {
      const campaign = await new CampaignBuilder()
        .withCompany(company)
        .withName(`Campaign ${i + 1}`)
        .build(this.prisma);
      campaigns.push(campaign);
    }

    return { user, company, token, campaigns };
  }
}
