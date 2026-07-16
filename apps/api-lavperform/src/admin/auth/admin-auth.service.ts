import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { AdminJwtPayload } from './interfaces/admin-jwt-payload.interface';

export interface AdminLoginResponse {
  access_token: string;
}

export interface AdminProfileResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AdminRole;
}

export interface AdminProfileUpdateResponse {
  access_token: string;
  profile: AdminProfileResponse;
}

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  isActive: true,
} as const;

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: AdminLoginDto): Promise<AdminLoginResponse> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { email: loginDto.email },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Administrador ou senha incorretos.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, adminUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Administrador ou senha incorretos.');
    }

    return {
      access_token: this.signAccessToken(adminUser),
    };
  }

  async getProfile(adminUserId: string): Promise<AdminProfileResponse> {
    const adminUser = await this.findActiveAdminUser(adminUserId);
    return this.toProfileResponse(adminUser);
  }

  async updateProfile(
    adminUserId: string,
    dto: UpdateAdminProfileDto,
  ): Promise<AdminProfileUpdateResponse> {
    const adminUser = await this.findActiveAdminUser(adminUserId);

    const updated = await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: {
        ...(dto.avatarUrl !== undefined
          ? { avatarUrl: dto.avatarUrl || null }
          : {}),
      },
      select: PROFILE_SELECT,
    });

    return {
      access_token: this.signAccessToken(updated),
      profile: this.toProfileResponse(updated),
    };
  }

  private async findActiveAdminUser(adminUserId: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: PROFILE_SELECT,
    });

    if (!adminUser || !adminUser.isActive) {
      throw new NotFoundException('Administrador não encontrado');
    }

    return adminUser;
  }

  private toProfileResponse(adminUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: AdminRole;
  }): AdminProfileResponse {
    return {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      avatarUrl: adminUser.avatarUrl ?? null,
      role: adminUser.role,
    };
  }

  private signAccessToken(adminUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: AdminRole;
  }): string {
    const payload: AdminJwtPayload = {
      adminUserId: adminUser.id,
      adminUserName: adminUser.name,
      adminUserEmail: adminUser.email,
      adminUserAvatarUrl: adminUser.avatarUrl ?? null,
      role: adminUser.role ?? AdminRole.SUPER_ADMIN,
    };

    const expiresIn = process.env.ADMIN_JWT_EXPIRES_IN
      ? `${process.env.ADMIN_JWT_EXPIRES_IN}d`
      : '1d';

    return this.jwtService.sign(payload, {
      expiresIn: expiresIn as `${number}d`,
    });
  }
}
