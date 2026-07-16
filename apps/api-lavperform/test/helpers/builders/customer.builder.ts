import { PrismaClient, Customer, Company } from '@prisma/client';
import { CompanyBuilder } from './company.builder';

/**
 * Builder for creating Customer test data
 */
export class CustomerBuilder {
  private name = 'Test Customer';
  private phone = this.generatePhone();
  private email?: string;
  private birthDate?: Date;
  private firstOrderDate?: Date;
  private lastOrderDate?: Date;
  private bestOrderDay?: string;
  private bestOrderHour?: string;
  private lastContactDate?: Date;
  private rfvClassification = 'novo';
  private gender?: string;
  private observations?: string;
  private whatsappOptin = true;
  private averageTicket = 0;
  private company?: Company;

  /**
   * Sets the customer name
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Sets the customer phone
   */
  withPhone(phone: string): this {
    this.phone = phone;
    return this;
  }

  /**
   * Sets the customer email
   */
  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  /**
   * Sets the customer birth date
   */
  withBirthDate(date: Date): this {
    this.birthDate = date;
    return this;
  }

  /**
   * Sets the customer RFV classification
   */
  withRFVClassification(classification: string): this {
    this.rfvClassification = classification;
    return this;
  }

  /**
   * Sets the customer gender
   */
  withGender(gender: string): this {
    this.gender = gender;
    return this;
  }

  /**
   * Sets the customer WhatsApp opt-in status
   */
  withWhatsappOptin(optin: boolean): this {
    this.whatsappOptin = optin;
    return this;
  }

  /**
   * Sets the customer average ticket
   */
  withAverageTicket(amount: number): this {
    this.averageTicket = amount;
    return this;
  }

  /**
   * Associates the customer with a company
   */
  withCompany(company: Company): this {
    this.company = company;
    return this;
  }

  /**
   * Sets the customer observations
   */
  withObservations(observations: string): this {
    this.observations = observations;
    return this;
  }

  /**
   * Builds and persists the customer to the database
   */
  async build(prisma: PrismaClient): Promise<Customer> {
    // Create or use existing company
    if (!this.company) {
      this.company = await new CompanyBuilder().build(prisma);
    }

    return prisma.customer.create({
      data: {
        name: this.name,
        phone: this.phone,
        email: this.email,
        birthDate: this.birthDate,
        firstOrderDate: this.firstOrderDate,
        lastOrderDate: this.lastOrderDate,
        bestOrderDay: this.bestOrderDay,
        bestOrderHour: this.bestOrderHour,
        lastContactDate: this.lastContactDate,
        rfvClassification: this.rfvClassification,
        gender: this.gender,
        observations: this.observations,
        whatsappOptin: this.whatsappOptin,
        averageTicket: this.averageTicket,
        companyId: this.company.id,
      },
    });
  }

  /**
   * Generates a random phone number for testing
   */
  private generatePhone(): string {
    const random = Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0');
    return `+5511${random}`;
  }
}
