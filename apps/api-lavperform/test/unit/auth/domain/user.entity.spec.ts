import { UserEntity, UserCompanyData } from 'src/auth/domain/user.entity';
import { AccessRule } from 'src/auth/interfaces/jwt-payload.interface';

describe('UserEntity', () => {
  const mockAccessRules: AccessRule[] = [
    { module: 'customers', action: 'read' },
    { module: 'customers', action: 'create' },
  ];

  const mockUserCompanies: UserCompanyData[] = [
    {
      id: 'uc-1',
      companyId: 'company-1',
      company: {
        id: 'company-1',
        name: 'Test Company',
        avatarUrl: 'https://example.com/avatar.png',
        slug: 'test-company',
      },
    },
    {
      id: 'uc-2',
      companyId: 'company-2',
      company: {
        id: 'company-2',
        name: 'Second Company',
        avatarUrl: null,
        slug: null,
      },
    },
  ];

  describe('constructor', () => {
    it('should create a user entity with all fields', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        mockUserCompanies,
        mockAccessRules,
      );

      expect(user.id).toBe('user-1');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('John Doe');
      expect(user.phone).toBe('+5511999999999');
      expect(user.password).toBe('hashed_password');
      expect(user.userCompanies).toEqual(mockUserCompanies);
      expect(user.accessRules).toEqual(mockAccessRules);
    });

    it('should create a user entity without optional fields', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );

      expect(user.id).toBe('user-1');
      expect(user.userCompanies).toBeUndefined();
      expect(user.accessRules).toBeUndefined();
    });
  });

  describe('hasCompanies', () => {
    it('should return true when user has companies', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        mockUserCompanies,
      );

      expect(user.hasCompanies()).toBe(true);
    });

    it('should return false when userCompanies is undefined', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
      );

      expect(user.hasCompanies()).toBe(false);
    });

    it('should return false when userCompanies is an empty array', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        [],
      );

      expect(user.hasCompanies()).toBe(false);
    });
  });

  describe('getActiveCompany', () => {
    it('should return the first company when user has companies', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        mockUserCompanies,
      );

      const activeCompany = user.getActiveCompany();

      expect(activeCompany).toEqual({
        id: 'company-1',
        name: 'Test Company',
        avatarUrl: 'https://example.com/avatar.png',
        slug: 'test-company',
      });
    });

    it('should return null when user has no companies', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
      );

      const activeCompany = user.getActiveCompany();

      expect(activeCompany).toBeNull();
    });

    it('should return null when userCompanies is an empty array', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        [],
      );

      const activeCompany = user.getActiveCompany();

      expect(activeCompany).toBeNull();
    });
  });
});
