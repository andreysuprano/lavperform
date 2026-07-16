import { AdminRole } from '@prisma/client';

export interface AdminJwtPayload {
  adminUserId: string;
  adminUserName: string;
  adminUserEmail: string;
  adminUserAvatarUrl?: string | null;
  role: AdminRole;
}
