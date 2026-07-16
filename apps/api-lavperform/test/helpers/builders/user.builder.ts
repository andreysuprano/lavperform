import { PrismaClient, User, Company } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CompanyBuilder } from './company.builder';

/**
 * Builder for creating User test data
 */
export class UserBuilder {
  private email = `test-${Date.now()}@example.com`;
  private name = 'Test User';
  private phone = '+5511999999999';
  private password = 'password123';
  private company?: Company;
  private accessRules: Array<{ module: string; action: string }> = [];

  /**
   * Sets the user email
   */
  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  /**
   * Sets the user name
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Sets the user phone
   */
  withPhone(phone: string): this {
    this.phone = phone;
    return this;
  }

  /**
   * Sets the user password (plain text, will be hashed)
   */
  withPassword(password: string): this {
    this.password = password;
    return this;
  }

  /**
   * Associates the user with a company
   */
  withCompany(company: Company): this {
    this.company = company;
    return this;
  }

  /**
   * Sets access rules for the user
   */
  withAccessRules(rules: Array<{ module: string; action: string }>): this {
    this.accessRules = rules;
    return this;
  }

  /**
   * Builds and persists the user to the database
   */
  async build(prisma: PrismaClient): Promise<User> {
    // Hash the password
    const hashedPassword = await bcrypt.hash(this.password, 10);

    // Create or use existing company
    if (!this.company) {
      this.company = await new CompanyBuilder().build(prisma);
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: this.email,
        name: this.name,
        phone: this.phone,
        password: hashedPassword,
      },
    });

    // Associate user with company
    if (this.company) {
      await prisma.userCompany.create({
        data: {
          userId: user.id,
          companyId: this.company.id,
        },
      });
    }

    // Create access rules if provided
    if (this.accessRules.length > 0) {
      await prisma.accessRule.createMany({
        data: this.accessRules.map((rule) => ({
          userId: user.id,
          companyId: this.company!.id,
          module: rule.module,
          action: rule.action,
        })),
      });
    }

    return user;
  }

  /**
   * Returns the plain text password (useful for login tests)
   */
  getPlainPassword(): string {
    return this.password;
  }
}
