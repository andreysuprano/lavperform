import { NotFoundException } from '@nestjs/common';
import { ApplicationService } from 'src/application/application.service';
import { IUserRepository } from 'src/auth/domain/user.repository.interface';
import { UserEntity } from 'src/auth/domain/user.entity';

jest.mock('src/common/utils/date.utils', () => ({
  getDayOfWeekPtBr: jest.fn(() => 'segunda'),
}));

describe('ApplicationService', () => {
  const mockUserRepository: jest.Mocked<IUserRepository> = {
    findByIdWithCompaniesAndAddress: jest.fn(),
    findByEmailWithCompaniesAndRules: jest.fn(),
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockWhatsappService: any = {}; // stubbed, not used by getUserCompanies tests

  let service: ApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ApplicationService(mockUserRepository, mockWhatsappService);
  });

  it('throws when userId is missing', async () => {
    await expect(service.getUserCompanies('')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when user is not found', async () => {
    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(null);
    await expect(service.getUserCompanies('user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns mapped companies when user exists', async () => {
    const mockUser = new UserEntity(
      'user-1',
      'test@example.com',
      'Test User',
      '999999999',
      'hashed-password',
      new Date(),
      new Date(),
      [
        {
          id: 'uc-1',
          companyId: 'c1',
          company: {
            id: 'c1',
            name: 'Comp',
            cnpj: '123',
            email: 'c@test.com',
            phone: '999',
            avatarUrl: 'url',
            slug: 'comp',
            address: {
              id: 'addr-1',
              street: 'S',
              number: '10',
              complement: 'A',
              neighborhood: 'N',
              city: 'City',
              state: 'ST',
              zipCode: '000',
            },
          },
        },
      ],
      undefined
    );

    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(mockUser);

    const result = await service.getUserCompanies('user-1');
    expect(result.companies[0]).toMatchObject({
      id: 'c1',
      name: 'Comp',
      email: 'c@test.com',
      address: expect.objectContaining({ street: 'S', number: '10' }),
    });
  });

  it('gracefully handles companies without address', async () => {
    const mockUser = new UserEntity(
      'user-2',
      'test2@example.com',
      'Test User 2',
      '888888888',
      'hashed-password',
      new Date(),
      new Date(),
      [
        {
          id: 'uc-2',
          companyId: 'c2',
          company: {
            id: 'c2',
            name: 'No Address',
            cnpj: '456',
            email: 'no@test.com',
            phone: '123',
            avatarUrl: null,
            slug: 'no-address',
            address: null,
          },
        },
      ],
      undefined
    );

    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(mockUser);

    const result = await service.getUserCompanies('user-2');
    expect(result.companies[0]).toMatchObject({
      id: 'c2',
      address: null,
    });
  });

  it('returns companies sorted alphabetically by name', async () => {
    const mockUser = new UserEntity(
      'user-4',
      'test4@example.com',
      'Test User 4',
      '666666666',
      'hashed-password',
      new Date(),
      new Date(),
      [
        {
          id: 'uc-3',
          companyId: 'c3',
          company: {
            id: 'c3',
            name: 'Zebra Restaurante',
            cnpj: '789',
            email: 'z@test.com',
            phone: '111',
            avatarUrl: null,
            slug: 'zebra',
            address: null,
          },
        },
        {
          id: 'uc-4',
          companyId: 'c4',
          company: {
            id: 'c4',
            name: 'Alpha Lanches',
            cnpj: '101',
            email: 'a@test.com',
            phone: '222',
            avatarUrl: null,
            slug: 'alpha',
            address: null,
          },
        },
        {
          id: 'uc-5',
          companyId: 'c5',
          company: {
            id: 'c5',
            name: 'Beta Pizzaria',
            cnpj: '202',
            email: 'b@test.com',
            phone: '333',
            avatarUrl: null,
            slug: 'beta',
            address: null,
          },
        },
      ],
      undefined
    );

    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(mockUser);

    const result = await service.getUserCompanies('user-4');
    expect(result.companies.map(c => c.name)).toEqual([
      'Alpha Lanches',
      'Beta Pizzaria',
      'Zebra Restaurante',
    ]);
  });

  it('returns empty array when user has no companies', async () => {
    const mockUser = new UserEntity(
      'user-3',
      'test3@example.com',
      'Test User 3',
      '777777777',
      'hashed-password',
      new Date(),
      new Date(),
      undefined,
      undefined
    );

    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(mockUser);

    const result = await service.getUserCompanies('user-3');
    expect(result.companies).toEqual([]);
  });

  it('returns current day message', async () => {
    const message = await service.getMessage();
    expect(message).toBe('segunda');
  });
});
