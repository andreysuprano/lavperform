import { Test, TestingModule } from '@nestjs/testing';
import { BusinessPartnerPrismaRepository } from 'src/partners/infrastructure/persistence/prisma-business-partner.repository';
import { PrismaService } from 'src/prisma/prisma.service';

describe('BusinessPartnerPrismaRepository', () => {
  let repository: BusinessPartnerPrismaRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    businessPartner: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessPartnerPrismaRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<BusinessPartnerPrismaRepository>(BusinessPartnerPrismaRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return array of business partners', async () => {
      const mockPartners = [
        {
          id: 'bp-1',
          name: 'Partner 1',
          email: 'partner1@example.com',
          phone: '+5511999999999',
          cnpj: '12345678901234',
          avatarUrl: 'https://example.com/avatar.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.businessPartner.findMany.mockResolvedValue(mockPartners);

      const result = await repository.findAll();

      expect(prismaService.businessPartner.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bp-1');
      expect(result[0].name).toBe('Partner 1');
    });

    it('should return empty array when no partners exist', async () => {
      mockPrismaService.businessPartner.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return business partner when found', async () => {
      const mockPartner = {
        id: 'bp-1',
        name: 'Partner 1',
        email: 'partner1@example.com',
        phone: '+5511999999999',
        cnpj: '12345678901234',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.businessPartner.findUnique.mockResolvedValue(mockPartner);

      const result = await repository.findById('bp-1');

      expect(prismaService.businessPartner.findUnique).toHaveBeenCalledWith({
        where: { id: 'bp-1' },
      });
      expect(result).toBeDefined();
      expect(result!.id).toBe('bp-1');
      expect(result!.name).toBe('Partner 1');
    });

    it('should return null when not found', async () => {
      mockPrismaService.businessPartner.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return business partner when found by email', async () => {
      const mockPartner = {
        id: 'bp-1',
        name: 'Partner 1',
        email: 'partner1@example.com',
        phone: null,
        cnpj: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.businessPartner.findFirst.mockResolvedValue(mockPartner);

      const result = await repository.findByEmail('partner1@example.com');

      expect(prismaService.businessPartner.findFirst).toHaveBeenCalledWith({
        where: { email: 'partner1@example.com' },
      });
      expect(result).toBeDefined();
      expect(result!.email).toBe('partner1@example.com');
    });

    it('should return null when email not found', async () => {
      mockPrismaService.businessPartner.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return business partner', async () => {
      const createData = {
        name: 'New Partner',
        email: 'new@example.com',
        phone: '+5511999999999',
        cnpj: '12345678901234',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      const mockCreated = {
        id: 'bp-new',
        ...createData,
        phone: createData.phone!,
        cnpj: createData.cnpj!,
        avatarUrl: createData.avatarUrl!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.businessPartner.create.mockResolvedValue(mockCreated);

      const result = await repository.create(createData);

      expect(prismaService.businessPartner.create).toHaveBeenCalledWith({
        data: {
          name: 'New Partner',
          email: 'new@example.com',
          phone: '+5511999999999',
          cnpj: '12345678901234',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });
      expect(result.id).toBe('bp-new');
      expect(result.name).toBe('New Partner');
    });

    it('should create with null optional fields', async () => {
      const createData = {
        name: 'Minimal Partner',
        email: 'minimal@example.com',
      };
      const mockCreated = {
        id: 'bp-minimal',
        name: 'Minimal Partner',
        email: 'minimal@example.com',
        phone: null,
        cnpj: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.businessPartner.create.mockResolvedValue(mockCreated);

      const result = await repository.create(createData);

      expect(result.phone).toBeNull();
      expect(result.cnpj).toBeUndefined(); // Mapper converts null to undefined
    });
  });

  describe('update', () => {
    it('should update and return business partner', async () => {
      const updateData = {
        name: 'Updated Partner',
        email: 'updated@example.com',
      };
      const mockUpdated = {
        id: 'bp-1',
        name: 'Updated Partner',
        email: 'updated@example.com',
        phone: '+5511999999999',
        cnpj: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.businessPartner.update.mockResolvedValue(mockUpdated);

      const result = await repository.update('bp-1', updateData);

      expect(prismaService.businessPartner.update).toHaveBeenCalledWith({
        where: { id: 'bp-1' },
        data: {
          name: 'Updated Partner',
          email: 'updated@example.com',
        },
      });
      expect(result.name).toBe('Updated Partner');
    });
  });

  describe('delete', () => {
    it('should delete business partner', async () => {
      mockPrismaService.businessPartner.delete.mockResolvedValue({});

      await repository.delete('bp-1');

      expect(prismaService.businessPartner.delete).toHaveBeenCalledWith({
        where: { id: 'bp-1' },
      });
    });
  });
});
