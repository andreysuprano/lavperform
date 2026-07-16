import { AdminApiKeysService } from 'src/admin/api-keys/admin-api-keys.service';
import { PublicApiKeysService } from 'src/public-api/api-keys/public-api-keys.service';

describe('AdminApiKeysService', () => {
  let service: AdminApiKeysService;

  const mockPublicApiKeysService = {
    list: jest.fn(),
    getActive: jest.fn(),
    create: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminApiKeysService(
      mockPublicApiKeysService as unknown as PublicApiKeysService,
    );
  });

  it('delega getActive para PublicApiKeysService', async () => {
    mockPublicApiKeysService.getActive.mockResolvedValue({ id: 'key-1' });

    await service.getActive('company-1');

    expect(mockPublicApiKeysService.getActive).toHaveBeenCalledWith('company-1');
  });

  it('delega rotate para PublicApiKeysService', async () => {
    mockPublicApiKeysService.rotate.mockResolvedValue({ id: 'key-2' });

    await service.rotate('company-1', { name: 'Teste' });

    expect(mockPublicApiKeysService.rotate).toHaveBeenCalledWith('company-1', {
      name: 'Teste',
    });
  });
});
