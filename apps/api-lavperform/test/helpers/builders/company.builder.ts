import { PrismaClient, Company, CompanyStatus } from '@prisma/client';

/**
 * Builder for creating Company test data
 */
export class CompanyBuilder {
  private name = 'Test Company';
  private cnpj = this.generateCNPJ();
  private email = 'company@test.com';
  private phone?: string;
  private avatarUrl?: string;
  private slug?: string;
  private state: CompanyStatus = 'ACTIVE';

  /**
   * Sets the company name
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Sets the company CNPJ
   */
  withCNPJ(cnpj: string): this {
    this.cnpj = cnpj;
    return this;
  }

  /**
   * Sets the company email
   */
  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  /**
   * Sets the company phone
   */
  withPhone(phone: string): this {
    this.phone = phone;
    return this;
  }

  /**
   * Sets the company avatar URL
   */
  withAvatarUrl(url: string): this {
    this.avatarUrl = url;
    return this;
  }

  /**
   * Sets the company slug
   */
  withSlug(slug: string): this {
    this.slug = slug;
    return this;
  }

  /**
   * Sets the company state (ACTIVE, INACTIVE, PENDING)
   */
  withState(state: CompanyStatus): this {
    this.state = state;
    return this;
  }

  /**
   * Builds and persists the company to the database
   */
  async build(prisma: PrismaClient): Promise<Company> {
    return prisma.company.create({
      data: {
        name: this.name,
        cnpj: this.cnpj,
        email: this.email,
        phone: this.phone,
        avatarUrl: this.avatarUrl,
        slug: this.slug,
        state: this.state,
      },
    });
  }

  /**
   * Generates a random valid CNPJ for testing
   * Format: XX.XXX.XXX/XXXX-XX
   */
  private generateCNPJ(): string {
    const random = Math.floor(Math.random() * 100000000000000)
      .toString()
      .padStart(14, '0');
    return `${random.slice(0, 2)}.${random.slice(2, 5)}.${random.slice(5, 8)}/${random.slice(8, 12)}-${random.slice(12, 14)}`;
  }
}
