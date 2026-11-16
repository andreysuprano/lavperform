import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { LinkPageDto } from './dto/link-page-dto';
import { ILinkPageRepository } from '../domain/link-page.repository.interface';
import { ILinkRepository } from '../domain/link.repository.interface';
import { IGalleryRepository } from '../domain/gallery.repository.interface';
import { ICompanyRepository } from '../../companies/domain/company.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LinkPageService {
  private readonly logger: Logger;

  constructor(
    @Inject('ILinkPageRepository')
    private readonly linkPageRepository: ILinkPageRepository,
    @Inject('ILinkRepository')
    private readonly linkRepository: ILinkRepository,
    @Inject('IGalleryRepository')
    private readonly galleryRepository: IGalleryRepository,
    @Inject('ICompanyRepository')
    private readonly companyRepository: ICompanyRepository,
    private readonly prisma: PrismaService,
  ) {
    this.logger = new Logger(LinkPageService.name);
  }

  async getLinkPage(slug: string) {
    const company = await this.companyRepository.findWithLinksAndMenu(slug);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.withPublicTracking(company);
  }

  async getLinkPageByPage(companySlug: string, _pageSlug: string) {
    return this.getLinkPage(companySlug);
  }

  private async withPublicTracking(company: { id: string }) {
    const [pixel, gtm] = await Promise.all([
      this.prisma.companyMetaPixel.findUnique({ where: { companyId: company.id } }),
      this.prisma.companyGtmContainer.findUnique({ where: { companyId: company.id } }),
    ]);

    return {
      ...company,
      metaPixelId: pixel?.enabled ? pixel.pixelId : null,
      gtmContainerId: gtm?.enabled ? gtm.containerId : null,
    };
  }

  async updateLinkPage(slug: string, linkPageDto: LinkPageDto) {
    const company = await this.companyRepository.findBySlug(slug);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Update LinkPage basic info
    await this.linkPageRepository.updateByCompanyId(company.id, {
      biography: linkPageDto.biography,
      coverImage: linkPageDto.coverImage,
      bgColor: linkPageDto.bgColor,
    } as any);

    const linkPage = await this.linkPageRepository.findByCompanyId(company.id);

    if (!linkPage) {
      throw new NotFoundException('Página de links não encontrada');
    }

    if (linkPageDto.links) {
      Promise.all(linkPageDto.links.map(async (link) => {
        if (link.id) {
          await this.linkRepository.update(link.id, link);
        } else {
          await this.linkRepository.create({
            label: link.label,
            linkPageId: linkPage.id,
            url: link.url,
            icon: link.icon,
            iconType: link.iconType,
          });
        }
      }));
    }

    if (linkPageDto.galleries) {
      Promise.all(linkPageDto.galleries.map(async (gallery) => {
        if (gallery.id) {
          await this.galleryRepository.update(gallery.id, gallery);
        } else {
          await this.galleryRepository.create({
            ...gallery,
            linkPageId: linkPage.id,
          });
        }
      }));
    }

    return {
      message: 'Página de links atualizada com sucesso',
    };
  }

  async deleteLink(id: string) {
    const link = await this.linkRepository.findById(id);
    if (!link) {
      throw new NotFoundException('Link não encontrado');
    }
    await this.linkRepository.delete(id);
    return {
      message: 'Link deletado com sucesso',
    };
  }

  async deleteGallery(id: string) {
    const gallery = await this.galleryRepository.findById(id);

    if (!gallery) {
      throw new NotFoundException('Galeria não encontrada');
    }

    await this.galleryRepository.delete(id);
    return {
      message: 'Galeria deletada com sucesso',
    };
  }
}
