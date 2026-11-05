import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrafficReadGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const companyId = request.params?.companyId;
    if (!userId || !companyId) {
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
    }

    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
    }
    return true;
  }
}
