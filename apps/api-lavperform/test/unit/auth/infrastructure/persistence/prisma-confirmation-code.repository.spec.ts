import { Test, TestingModule } from '@nestjs/testing';
import { PrismaConfirmationCodeRepository } from 'src/auth/infrastructure/persistence/prisma-confirmation-code.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfirmationCode } from '@prisma/client';

describe('PrismaConfirmationCodeRepository', () => {
  let repository: PrismaConfirmationCodeRepository;
  let prismaService: PrismaService;

  const mockPrismaConfirmationCode: ConfirmationCode = {
    id: 'code-1',
    code: '12345',
    userId: 'user-1',
    used: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  const mockPrismaService = {
    confirmationCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaConfirmationCodeRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaConfirmationCodeRepository>(PrismaConfirmationCodeRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new confirmation code', async () => {
      mockPrismaService.confirmationCode.create.mockResolvedValue(mockPrismaConfirmationCode);

      const result = await repository.create('12345', 'user-1');

      expect(prismaService.confirmationCode.create).toHaveBeenCalledWith({
        data: { code: '12345', userId: 'user-1' },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('code-1');
      expect(result.code).toBe('12345');
      expect(result.userId).toBe('user-1');
      expect(result.used).toBe(false);
    });

    it('should return ConfirmationCodeEntity instance', async () => {
      mockPrismaService.confirmationCode.create.mockResolvedValue(mockPrismaConfirmationCode);

      const result = await repository.create('12345', 'user-1');

      expect(result.isValid()).toBe(true);
    });

    it('should create code with different values', async () => {
      const newCode: ConfirmationCode = {
        id: 'code-2',
        code: '67890',
        userId: 'user-2',
        used: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-02'),
      };

      mockPrismaService.confirmationCode.create.mockResolvedValue(newCode);

      const result = await repository.create('67890', 'user-2');

      expect(result.code).toBe('67890');
      expect(result.userId).toBe('user-2');
    });
  });

  describe('findUnusedByCode', () => {
    it('should find an unused confirmation code', async () => {
      mockPrismaService.confirmationCode.findFirst.mockResolvedValue(mockPrismaConfirmationCode);

      const result = await repository.findUnusedByCode('12345');

      expect(prismaService.confirmationCode.findFirst).toHaveBeenCalledWith({
        where: { code: '12345', used: false },
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe('code-1');
      expect(result!.code).toBe('12345');
      expect(result!.used).toBe(false);
    });

    it('should return null when code is not found', async () => {
      mockPrismaService.confirmationCode.findFirst.mockResolvedValue(null);

      const result = await repository.findUnusedByCode('nonexistent');

      expect(prismaService.confirmationCode.findFirst).toHaveBeenCalledWith({
        where: { code: 'nonexistent', used: false },
      });

      expect(result).toBeNull();
    });

    it('should return null when code is already used', async () => {
      mockPrismaService.confirmationCode.findFirst.mockResolvedValue(null);

      const result = await repository.findUnusedByCode('12345');

      expect(result).toBeNull();
    });

    it('should return ConfirmationCodeEntity instance', async () => {
      mockPrismaService.confirmationCode.findFirst.mockResolvedValue(mockPrismaConfirmationCode);

      const result = await repository.findUnusedByCode('12345');

      expect(result).toBeDefined();
      expect(result!.isValid()).toBe(true);
    });
  });

  describe('markAsUsed', () => {
    it('should mark a confirmation code as used', async () => {
      const usedCode: ConfirmationCode = {
        ...mockPrismaConfirmationCode,
        used: true,
        updatedAt: new Date('2024-01-03'),
      };

      mockPrismaService.confirmationCode.update.mockResolvedValue(usedCode);

      await repository.markAsUsed('code-1');

      expect(prismaService.confirmationCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        data: { used: true },
      });
    });

    it('should not throw error when update is successful', async () => {
      const usedCode: ConfirmationCode = {
        ...mockPrismaConfirmationCode,
        used: true,
      };

      mockPrismaService.confirmationCode.update.mockResolvedValue(usedCode);

      await expect(repository.markAsUsed('code-1')).resolves.not.toThrow();
    });

    it('should update different codes', async () => {
      const usedCode: ConfirmationCode = {
        ...mockPrismaConfirmationCode,
        id: 'code-2',
        used: true,
      };

      mockPrismaService.confirmationCode.update.mockResolvedValue(usedCode);

      await repository.markAsUsed('code-2');

      expect(prismaService.confirmationCode.update).toHaveBeenCalledWith({
        where: { id: 'code-2' },
        data: { used: true },
      });
    });
  });
});
