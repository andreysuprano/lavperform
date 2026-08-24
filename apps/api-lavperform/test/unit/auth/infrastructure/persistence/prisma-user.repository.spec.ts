import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUserRepository } from 'src/auth/infrastructure/persistence/prisma-user.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserCompany, Company, AccessRule } from '@prisma/client';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prismaService: PrismaService;

  const mockPrismaCompany: Company = {
    id: 'company-1',
    name: 'Test Company',
    cnpj: '12345678901234',
    email: 'company@example.com',
    phone: '+5511999999999',
    avatarUrl: 'https://example.com/avatar.png',
    addressId: 'address-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    slug: 'test-company',
    businessPartnerId: null,
    state: 'ACTIVE',
    overAgentCompanyId: null,
    showIncentivizedSales: true,
    showTodayPurchases: true,
    deletedAt: null,
    asaasCustomerId: null,
  };

  const mockPrismaUserCompany: UserCompany & { company: Company } = {
    id: 'uc-1',
    userId: 'user-1',
    companyId: 'company-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    company: mockPrismaCompany,
  };

  const mockPrismaAccessRule: AccessRule = {
    id: 'rule-1',
    userId: 'user-1',
    companyId: 'company-1',
    module: 'customers',
    action: 'read',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  const mockPrismaUser: User & {
    userCompanies?: (UserCompany & { company: Company })[];
    accessRules?: AccessRule[];
  } = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'John Doe',
    phone: '+5511999999999',
    password: 'hashed_password',
    avatarUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    userCompanies: [mockPrismaUserCompany],
    accessRules: [mockPrismaAccessRule],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('findByEmailWithCompaniesAndRules', () => {
    it('should find user by email with companies and access rules', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findByEmailWithCompaniesAndRules('test@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          userCompanies: {
            include: {
              company: true,
            },
          },
          accessRules: true,
        },
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-1');
      expect(result!.email).toBe('test@example.com');
      expect(result!.userCompanies).toHaveLength(1);
      expect(result!.accessRules).toHaveLength(1);
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmailWithCompaniesAndRules('nonexistent@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
        include: {
          userCompanies: {
            include: {
              company: true,
            },
          },
          accessRules: true,
        },
      });

      expect(result).toBeNull();
    });

    it('should return UserEntity instance', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findByEmailWithCompaniesAndRules('test@example.com');

      expect(result).toBeDefined();
      expect(result!.hasCompanies()).toBe(true);
      expect(result!.getActiveCompany()).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email without relations', async () => {
      const userWithoutRelations: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'John Doe',
        phone: '+5511999999999',
        password: 'hashed_password',
        avatarUrl: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutRelations);

      const result = await repository.findByEmail('test@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-1');
      expect(result!.email).toBe('test@example.com');
      expect(result!.userCompanies).toBeUndefined();
      expect(result!.accessRules).toBeUndefined();
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const updatedUser: User = {
        ...mockPrismaUser,
        password: 'new_hashed_password',
        updatedAt: new Date('2024-01-03'),
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await repository.updatePassword('user-1', 'new_hashed_password');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new_hashed_password' },
      });
    });

    it('should not throw error when update is successful', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockPrismaUser);

      await expect(repository.updatePassword('user-1', 'new_password')).resolves.not.toThrow();
    });
  });
});
