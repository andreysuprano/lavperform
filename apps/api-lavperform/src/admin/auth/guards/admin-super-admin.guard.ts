import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminJwtPayload } from '../interfaces/admin-jwt-payload.interface';

@Injectable()
export class AdminSuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AdminJwtPayload }>();
    const role = request.user?.role;

    if (role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem executar esta ação.',
      );
    }

    return true;
  }
}
