import { NotFoundException } from '@nestjs/common';
import { LinkPageService } from 'src/link-page/application/link-page.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('LinkPageService', () => {
  let service: LinkPageService;

  const linkPageRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCompanyId: jest.fn(),
    findByCompanyIdWithRelations: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateByCompanyId: jest.fn(),
  };

  const linkRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByLinkPageId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const galleryRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByLinkPageId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const companyRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findWithLinksAndMenu: jest.fn(),
    findBySlug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkPageService,
        { provide: 'ILinkPageRepository', useValue: linkPageRepository },
        { provide: 'ILinkRepository', useValue: linkRepository },
        { provide: 'IGalleryRepository', useValue: galleryRepository },
        { provide: 'ICompanyRepository', useValue: companyRepository },
      ],
    }).compile();

    service = module.get<LinkPageService>(LinkPageService);
  });

  it('throws when link page is missing', async () => {
    companyRepository.findWithLinksAndMenu.mockResolvedValue(null);
    await expect(service.getLinkPage('slug')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns link page data', async () => {
    companyRepository.findWithLinksAndMenu.mockResolvedValue({ id: 'comp', linkPages: [] });
    const result = await service.getLinkPage('slug');
    expect(result).toEqual({ id: 'comp', linkPages: [] });
  });

  it('updates link page creating and updating links and galleries', async () => {
    companyRepository.findBySlug.mockResolvedValue({ id: 'comp1' });
    linkPageRepository.updateByCompanyId.mockResolvedValue(undefined);
    linkPageRepository.findByCompanyId.mockResolvedValue({ id: 'lp1' });

    await service.updateLinkPage('slug', {
      biography: 'bio',
      coverImage: 'cover',
      bgColor: '#000',
      links: [
        { id: 'link1', label: 'L1', url: 'u1', icon: 'i1', iconType: 'type1' },
        { label: 'L2', url: 'u2', icon: 'i2', iconType: 'type2' },
      ],
      galleries: [
        { id: 'g1', title: 'G1', imageUrl: 'img1' },
        { title: 'G2', imageUrl: 'img2' },
      ],
    } as any);

    expect(linkRepository.update).toHaveBeenCalledWith('link1', expect.objectContaining({ label: 'L1' }));
    expect(linkRepository.create).toHaveBeenCalled();
    expect(galleryRepository.update).toHaveBeenCalled();
    expect(galleryRepository.create).toHaveBeenCalled();
  });

  it('throws when company is missing on update', async () => {
    companyRepository.findBySlug.mockResolvedValue(null);
    await expect(service.updateLinkPage('slug', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when link page is missing on update', async () => {
    companyRepository.findBySlug.mockResolvedValue({ id: 'comp1' });
    linkPageRepository.updateByCompanyId.mockResolvedValue(undefined);
    linkPageRepository.findByCompanyId.mockResolvedValue(null);

    await expect(
      service.updateLinkPage('slug', { links: [], galleries: [] } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes link when found', async () => {
    linkRepository.findById.mockResolvedValue({ id: 'l1' });
    linkRepository.delete.mockResolvedValue({});
    const result = await service.deleteLink('l1');
    expect(result.message).toMatch(/deletado/);
  });

  it('throws when link is missing on delete', async () => {
    linkRepository.findById.mockResolvedValue(null);
    await expect(service.deleteLink('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes gallery when found', async () => {
    galleryRepository.findById.mockResolvedValue({ id: 'g1' });
    galleryRepository.delete.mockResolvedValue({});
    const result = await service.deleteGallery('g1');
    expect(result.message).toMatch(/Galeria deletada/);
  });

  it('throws when gallery is missing', async () => {
    galleryRepository.findById.mockResolvedValue(null);
    await expect(service.deleteGallery('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});