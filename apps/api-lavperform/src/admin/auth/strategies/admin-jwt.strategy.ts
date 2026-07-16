import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminJwtPayload } from '../interfaces/admin-jwt-payload.interface';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error('ADMIN_JWT_SECRET não está definido');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ADMIN_JWT_SECRET,
    });
  }

  async validate(payload: AdminJwtPayload) {
    return {
      adminUserId: payload.adminUserId,
      adminUserName: payload.adminUserName,
      adminUserEmail: payload.adminUserEmail,
      adminUserAvatarUrl: payload.adminUserAvatarUrl ?? null,
      role: payload.role,
    };
  }
}
