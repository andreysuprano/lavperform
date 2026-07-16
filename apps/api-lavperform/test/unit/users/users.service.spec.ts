import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/application/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import { IUserRepository } from 'src/users/domain/user.repository.interface';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: IUserRepository;

  const mockRepository = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findAllWithFilters: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'IUserRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<IUserRepository>('IUserRepository');

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a user', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockRepository.create.mockResolvedValue({ id: 'u1', password: 'hashed_password' });

      const result = await service.create({
        name: 'User',
        email: 'test@example.com',
        password: 'password',
      } as any);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
      expect(result.id).toBe('u1');
      expect((result as any).password).toBeUndefined();
    });

    it('throws if email exists', async () => {
      mockRepository.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ email: 'test@example.com' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns users', async () => {
      mockRepository.findAllWithFilters.mockResolvedValue({ items: [{ id: '1' }], total: 1 });
      const result = await service.findAll({ page: 1, limit: 10 } as any);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns user', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });

    it('throws when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates user', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new');
      mockRepository.update.mockResolvedValue({ id: '1', name: 'Updated' });

      const result = await service.update('1', { name: 'Updated', password: 'new' } as any);
      expect(bcrypt.hash).toHaveBeenCalledWith('new', 10);
      expect(result.name).toBe('Updated');
    });

    it('throws when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.update('missing', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes user', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });
      mockRepository.delete.mockResolvedValue(undefined);

      await service.remove('1');
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('throws when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
