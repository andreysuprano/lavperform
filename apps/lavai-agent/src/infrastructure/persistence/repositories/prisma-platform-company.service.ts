import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLATFORM_COMPANY_SLUG,
  type PlatformCompanyPort,
} from '../../../application/platform-agent/ports/platform-company.port';

@Injectable()
export class PrismaPlatformCompanyService implements PlatformCompanyPort {
  private readonly logger = new Logger(PrismaPlatformCompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getId(): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { slug: PLATFORM_COMPANY_SLUG },
      select: { id: true },
    });
    if (!company) {
      this.logger.error(`Empresa plataforma ausente no motor: ${PLATFORM_COMPANY_SLUG}`);
      throw new InternalServerErrorException(
        `Empresa plataforma ausente no motor: ${PLATFORM_COMPANY_SLUG}`,
      );
    }
    return company.id;
  }
}
