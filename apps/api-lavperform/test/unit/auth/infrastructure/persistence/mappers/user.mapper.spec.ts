import { UserMapper } from 'src/auth/infrastructure/persistence/mappers/user.mapper';
import { User, UserCompany, Company, AccessRule } from '@prisma/client';
import { UserEntity } from 'src/auth/domain/user.entity';

describe('UserMapper', () => {
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    userCompanies: [mockPrismaUserCompany],
    accessRules: [mockPrismaAccessRule],
  };

  describe('toDomain', () => {
    it('should map Prisma user to domain entity with all relations', () => {
      const domainUser = UserMapper.toDomain(mockPrismaUser);

      expect(domainUser).toBeInstanceOf(UserEntity);
      expect(domainUser.id).toBe('user-1');
      expect(domainUser.email).toBe('test@example.com');
      expect(domainUser.name).toBe('John Doe');
      expect(domainUser.phone).toBe('+5511999999999');
      expect(domainUser.password).toBe('hashed_password');
      expect(domainUser.createdAt).toEqual(new Date('2024-01-01'));
      expect(domainUser.updatedAt).toEqual(new Date('2024-01-02'));

      expect(domainUser.userCompanies).toHaveLength(1);
      expect(domainUser.userCompanies![0]).toEqual({
        id: 'uc-1',
        companyId: 'company-1',
        company: {
          id: 'company-1',
          name: 'Test Company',
          avatarUrl: 'https://example.com/avatar.png',
          slug: 'test-company',
          cnpj: '12345678901234',
          email: 'company@example.com',
          phone: '+5511999999999',
          address: null,
        },
      });

      expect(domainUser.accessRules).toHaveLength(1);
      expect(domainUser.accessRules![0]).toEqual({
        module: 'customers',
        action: 'read',
      });
    });

    it('should map Prisma user to domain entity without relations', () => {
      const prismaUserWithoutRelations: User = {
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Jane Doe',
        phone: '+5511888888888',
        password: 'hashed_password_2',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-02'),
      };

      const domainUser = UserMapper.toDomain(prismaUserWithoutRelations);

      expect(domainUser).toBeInstanceOf(UserEntity);
      expect(domainUser.id).toBe('user-2');
      expect(domainUser.email).toBe('test2@example.com');
      expect(domainUser.name).toBe('Jane Doe');
      expect(domainUser.userCompanies).toBeUndefined();
      expect(domainUser.accessRules).toBeUndefined();
    });

    it('should handle null avatarUrl and slug in company', () => {
      const companyWithNulls = { ...mockPrismaCompany, avatarUrl: null, slug: null };
      const userCompanyWithNulls = { ...mockPrismaUserCompany, company: companyWithNulls };
      const prismaUser = { ...mockPrismaUser, userCompanies: [userCompanyWithNulls] };

      const domainUser = UserMapper.toDomain(prismaUser);

      expect(domainUser.userCompanies![0].company.avatarUrl).toBeNull();
      expect(domainUser.userCompanies![0].company.slug).toBeNull();
    });

    it('should map multiple companies and access rules', () => {
      const secondCompany: Company = {
        ...mockPrismaCompany,
        id: 'company-2',
        name: 'Second Company',
      };

      const secondUserCompany: UserCompany & { company: Company } = {
        id: 'uc-2',
        userId: 'user-1',
        companyId: 'company-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: secondCompany,
      };

      const secondAccessRule: AccessRule = {
        ...mockPrismaAccessRule,
        id: 'rule-2',
        module: 'orders',
        action: 'create',
      };

      const prismaUser = {
        ...mockPrismaUser,
        userCompanies: [mockPrismaUserCompany, secondUserCompany],
        accessRules: [mockPrismaAccessRule, secondAccessRule],
      };

      const domainUser = UserMapper.toDomain(prismaUser);

      expect(domainUser.userCompanies).toHaveLength(2);
      expect(domainUser.accessRules).toHaveLength(2);
    });
  });

  describe('toDomainArray', () => {
    it('should map an array of Prisma users to domain entities', () => {
      const prismaUser2: User = {
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Jane Doe',
        phone: '+5511888888888',
        password: 'hashed_password_2',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-02'),
      };

      const domainUsers = UserMapper.toDomainArray([mockPrismaUser, prismaUser2]);

      expect(domainUsers).toHaveLength(2);
      expect(domainUsers[0]).toBeInstanceOf(UserEntity);
      expect(domainUsers[1]).toBeInstanceOf(UserEntity);
      expect(domainUsers[0].id).toBe('user-1');
      expect(domainUsers[1].id).toBe('user-2');
    });

    it('should return an empty array when given an empty array', () => {
      const domainUsers = UserMapper.toDomainArray([]);

      expect(domainUsers).toEqual([]);
    });
  });
});
