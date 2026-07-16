import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const company = await this.prisma.company.findFirst({
      where: { id: payload.companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      throw new UnauthorizedException('Empresa não encontrada ou foi removida');
    }

    return {
      userId: payload.userId,
      userName: payload.userName,
      userEmail: payload.userEmail,
      companyId: payload.companyId,
      companyName: payload.companyName,
      companyAvatar: payload.companyAvatar,
      accessRules: payload.accessRules,
    };
  }
} 