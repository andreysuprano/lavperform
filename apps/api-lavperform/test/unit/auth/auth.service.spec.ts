import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from 'src/auth/domain/user.repository.interface';
import { IConfirmationCodeRepository } from 'src/auth/domain/confirmation-code.repository.interface';
import { UserEntity, UserCompanyData } from 'src/auth/domain/user.entity';
import { ConfirmationCodeEntity } from 'src/auth/domain/confirmation-code.entity';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LoginDto } from 'src/auth/dto/login.dto';
import { ForgotPasswordDto, ConfirmCodeDto } from 'src/auth/dto/forgot-password';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock Smtp
jest.mock('src/common/smtp/smtp', () => ({
  Smtp: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: IUserRepository;
  let confirmationCodeRepository: IConfirmationCodeRepository;
  let jwtService: JwtService;

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
  ];

  const mockUser = new UserEntity(
    'user-1',
    'test@example.com',
    'John Doe',
    '+5511999999999',
    'hashed_password',
    new Date('2024-01-01'),
    new Date('2024-01-02'),
    mockUserCompanies,
    [
      { module: 'customers', action: 'read' },
      { module: 'customers', action: 'create' },
    ],
  );

  const mockUserRepository = {
    findByEmailWithCompaniesAndRules: jest.fn(),
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockConfirmationCodeRepository = {
    create: jest.fn(),
    findUnusedByCode: jest.fn(),
    markAsUsed: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'IConfirmationCodeRepository',
          useValue: mockConfirmationCodeRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<IUserRepository>('IUserRepository');
    confirmationCodeRepository = module.get<IConfirmationCodeRepository>('IConfirmationCodeRepository');
    jwtService = module.get<JwtService>(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('should throw UnauthorizedException when email is not provided', async () => {
      await expect(service.validateUser('', password)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser('', password)).rejects.toThrow('Email e senha são obrigatórios');
    });

    it('should throw UnauthorizedException when password is not provided', async () => {
      await expect(service.validateUser(email, '')).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(email, '')).rejects.toThrow('Email e senha são obrigatórios');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findByEmailWithCompaniesAndRules.mockResolvedValue(null);

      await expect(service.validateUser(email, password)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'Usuário ou senha incorretos. Verifique e tente novamente.',
      );

      expect(userRepository.findByEmailWithCompaniesAndRules).toHaveBeenCalledWith(email);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUserRepository.findByEmailWithCompaniesAndRules.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.validateUser(email, password)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'Usuário ou senha incorretos. Verifique e tente novamente.',
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('should return user when credentials are valid', async () => {
      mockUserRepository.findByEmailWithCompaniesAndRules.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmailWithCompaniesAndRules).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      mockUserRepository.findByEmailWithCompaniesAndRules.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('jwt_token_here');
      process.env.JWT_EXPIRES_IN = '7';
    });

    it('should return access token when login is successful', async () => {
      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'jwt_token_here',
      });
    });

    it('should generate JWT with correct payload', async () => {
      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'test@example.com',
          companyId: 'company-1',
          companyName: 'Test Company',
          companyAvatar: 'https://example.com/avatar.png',
          accessRules: [
            { module: 'customers', action: 'read' },
            { module: 'customers', action: 'create' },
          ],
          slug: 'test-company',
        },
        { expiresIn: '7d' },
      );
    });

    it('should throw UnauthorizedException when user has no companies', async () => {
      const userWithoutCompanies = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        [],
      );

      mockUserRepository.findByEmailWithCompaniesAndRules.mockResolvedValue(userWithoutCompanies);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Usuário não está vinculado a nenhuma empresa',
      );
    });

    it('should handle null avatarUrl and slug', async () => {
      const userCompaniesWithNulls: UserCompanyData[] = [
        {
          id: 'uc-1',
          companyId: 'company-1',
          company: {
            id: 'company-1',
            name: 'Test Company',
            avatarUrl: null,
            slug: null,
          },
        },
      ];

      const userWithNulls = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        userCompaniesWithNulls,
        [],
      );

      mockUserRepository.findByEmailWithCompaniesAndRules.mockResolvedValue(userWithNulls);

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          companyAvatar: '',
          slug: '',
        }),
        expect.any(Object),
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should create confirmation code and send email when user exists', async () => {
      const mockConfirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date(),
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockConfirmationCodeRepository.create.mockResolvedValue(mockConfirmationCode);

      await service.forgotPassword(forgotPasswordDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(confirmationCodeRepository.create).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{5}$/),
        'user-1',
      );
    });

    it('should return early when user does not exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await service.forgotPassword(forgotPasswordDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(confirmationCodeRepository.create).not.toHaveBeenCalled();
    });

    it('should generate 5-digit confirmation code', async () => {
      const mockConfirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date(),
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockConfirmationCodeRepository.create.mockResolvedValue(mockConfirmationCode);

      await service.forgotPassword(forgotPasswordDto);

      const createCall = mockConfirmationCodeRepository.create.mock.calls[0];
      const code = createCall[0];

      expect(code).toMatch(/^\d{5}$/);
      expect(parseInt(code)).toBeGreaterThanOrEqual(10000);
      expect(parseInt(code)).toBeLessThan(100000);
    });
  });

  describe('confirmCode', () => {
    const confirmCodeDto: ConfirmCodeDto = {
      code: '12345',
      password: 'new_password',
    };

    it('should throw BadRequestException when code is not found', async () => {
      mockConfirmationCodeRepository.findUnusedByCode.mockResolvedValue(null);

      await expect(service.confirmCode(confirmCodeDto)).rejects.toThrow(BadRequestException);
      await expect(service.confirmCode(confirmCodeDto)).rejects.toThrow(
        'Código de confirmação inválido',
      );

      expect(confirmationCodeRepository.findUnusedByCode).toHaveBeenCalledWith('12345');
    });

    it('should mark code as used and update password when code is valid', async () => {
      const mockConfirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date(),
        new Date(),
      );

      mockConfirmationCodeRepository.findUnusedByCode.mockResolvedValue(mockConfirmationCode);
      mockBcrypt.hash.mockResolvedValue('hashed_new_password' as never);

      await service.confirmCode(confirmCodeDto);

      expect(confirmationCodeRepository.findUnusedByCode).toHaveBeenCalledWith('12345');
      expect(confirmationCodeRepository.markAsUsed).toHaveBeenCalledWith('code-1');
      expect(bcrypt.hash).toHaveBeenCalledWith('new_password', 10);
      expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hashed_new_password');
    });

    it('should hash password with salt rounds of 10', async () => {
      const mockConfirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date(),
        new Date(),
      );

      mockConfirmationCodeRepository.findUnusedByCode.mockResolvedValue(mockConfirmationCode);
      mockBcrypt.hash.mockResolvedValue('hashed_password' as never);

      await service.confirmCode(confirmCodeDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('new_password', 10);
    });

    it('should call operations in correct order', async () => {
      const mockConfirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date(),
        new Date(),
      );

      const callOrder: string[] = [];

      mockConfirmationCodeRepository.findUnusedByCode.mockImplementation(async () => {
        callOrder.push('findUnusedByCode');
        return mockConfirmationCode;
      });

      mockConfirmationCodeRepository.markAsUsed.mockImplementation(async () => {
        callOrder.push('markAsUsed');
      });

      mockBcrypt.hash.mockImplementation(async () => {
        callOrder.push('hash');
        return 'hashed_password' as never;
      });

      mockUserRepository.updatePassword.mockImplementation(async () => {
        callOrder.push('updatePassword');
      });

      await service.confirmCode(confirmCodeDto);

      expect(callOrder).toEqual(['findUnusedByCode', 'markAsUsed', 'hash', 'updatePassword']);
    });
  });
});
