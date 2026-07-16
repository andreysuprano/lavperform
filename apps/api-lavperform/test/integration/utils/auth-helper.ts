import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class AuthHelper {
  private jwtService: JwtService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret-key',
      signOptions: { expiresIn: '1h' },
    });
  }

  /**
   * Creates a test user with company and returns access token
   */
  async createAuthenticatedUser(overrides: {
    email?: string;
    name?: string;
    companyName?: string;
  } = {}) {
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    // Create company
    const company = await this.prisma.company.create({
      data: {
        name: overrides.companyName || 'Test Company',
        cnpj: this.generateCNPJ(),
        email: 'company@test.com',
        state: 'ACTIVE',
        slug: 'test-company'
      },
    });

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: overrides.email || `test-${Date.now()}@example.com`,
        name: overrides.name || 'Test User',
        phone: '+5511999999999',
        password: hashedPassword,
        userCompanies: {
          create: {
            companyId: company.id,
          },
        },
      },
    });

    // Generate JWT token with correct payload structure
    const token = this.jwtService.sign({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      companyId: company.id,
      companyName: company.name,
      companyAvatar: company.avatarUrl || '',
      companies: [{
        id: company.id,
        name: company.name,
        avatarUrl: company.avatarUrl || '',
        slug: company.slug || ''
      }],
      accessRules: [],
      slug: company.slug || ''
    });

    return { user, company, token };
  }

  /**
   * Generate valid CNPJ for testing
   */
  private generateCNPJ(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `${random()}${random()}.${random()}${random()}${random()}.${random()}${random()}${random()}/${random()}${random()}${random()}${random()}-${random()}${random()}`;
  }
}