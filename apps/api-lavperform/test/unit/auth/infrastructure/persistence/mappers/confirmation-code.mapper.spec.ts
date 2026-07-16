import { ConfirmationCodeMapper } from 'src/auth/infrastructure/persistence/mappers/confirmation-code.mapper';
import { ConfirmationCode } from '@prisma/client';
import { ConfirmationCodeEntity } from 'src/auth/domain/confirmation-code.entity';

describe('ConfirmationCodeMapper', () => {
  const mockPrismaConfirmationCode: ConfirmationCode = {
    id: 'code-1',
    code: '12345',
    userId: 'user-1',
    used: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  describe('toDomain', () => {
    it('should map Prisma confirmation code to domain entity', () => {
      const domainCode = ConfirmationCodeMapper.toDomain(mockPrismaConfirmationCode);

      expect(domainCode).toBeInstanceOf(ConfirmationCodeEntity);
      expect(domainCode.id).toBe('code-1');
      expect(domainCode.code).toBe('12345');
      expect(domainCode.userId).toBe('user-1');
      expect(domainCode.used).toBe(false);
      expect(domainCode.createdAt).toEqual(new Date('2024-01-01'));
      expect(domainCode.updatedAt).toEqual(new Date('2024-01-02'));
    });

    it('should map used confirmation code', () => {
      const usedCode: ConfirmationCode = {
        ...mockPrismaConfirmationCode,
        used: true,
      };

      const domainCode = ConfirmationCodeMapper.toDomain(usedCode);

      expect(domainCode.used).toBe(true);
      expect(domainCode.isValid()).toBe(false);
    });

    it('should map unused confirmation code', () => {
      const domainCode = ConfirmationCodeMapper.toDomain(mockPrismaConfirmationCode);

      expect(domainCode.used).toBe(false);
      expect(domainCode.isValid()).toBe(true);
    });
  });

  describe('toDomainArray', () => {
    it('should map an array of Prisma confirmation codes to domain entities', () => {
      const prismaCode2: ConfirmationCode = {
        id: 'code-2',
        code: '67890',
        userId: 'user-2',
        used: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-02'),
      };

      const domainCodes = ConfirmationCodeMapper.toDomainArray([
        mockPrismaConfirmationCode,
        prismaCode2,
      ]);

      expect(domainCodes).toHaveLength(2);
      expect(domainCodes[0]).toBeInstanceOf(ConfirmationCodeEntity);
      expect(domainCodes[1]).toBeInstanceOf(ConfirmationCodeEntity);
      expect(domainCodes[0].id).toBe('code-1');
      expect(domainCodes[0].used).toBe(false);
      expect(domainCodes[1].id).toBe('code-2');
      expect(domainCodes[1].used).toBe(true);
    });

    it('should return an empty array when given an empty array', () => {
      const domainCodes = ConfirmationCodeMapper.toDomainArray([]);

      expect(domainCodes).toEqual([]);
    });
  });
});
