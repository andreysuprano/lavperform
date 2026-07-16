import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../src/auth/interfaces/jwt-payload.interface';
import { User, Company } from '@prisma/client';

/**
 * Generates a JWT token for testing purposes
 * @param payload Partial JWT payload
 * @returns JWT token string
 */
export function generateAuthToken(payload: Partial<JwtPayload>): string {
  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'test-secret-key-for-testing',
  });

  const fullPayload: JwtPayload = {
    userId: payload.userId || 'test-user-id',
    userName: payload.userName || 'Test User',
    userEmail: payload.userEmail || 'test@example.com',
    companyId: payload.companyId || 'test-company-id',
    companyName: payload.companyName || 'Test Company',
    slug: payload.slug || 'test-company',
    companyAvatar: payload.companyAvatar,
    companies: payload.companies || [],
    accessRules: payload.accessRules || [],
  };

  return jwtService.sign(fullPayload, { expiresIn: '1d' });
}

/**
 * Generates a JWT token from User and Company entities
 * @param user User entity
 * @param company Company entity
 * @param accessRules Optional access rules
 * @returns JWT token string
 */
export function generateAuthTokenFromEntities(
  user: User,
  company: Company,
  accessRules: Array<{ module: string; action: string }> = [],
): string {
  return generateAuthToken({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: company.id,
    companyName: company.name,
    slug: company.slug || undefined,
    companyAvatar: company.avatarUrl || undefined,
    companies: [
      {
        id: company.id,
        name: company.name,
        avatarUrl: company.avatarUrl || '',
        slug: company.slug || '',
      },
    ],
    accessRules,
  });
}

/**
 * Generates an authorization header with Bearer token
 * @param payload Partial JWT payload
 * @returns Authorization header object
 */
export function generateAuthHeader(payload: Partial<JwtPayload>): {
  Authorization: string;
} {
  const token = generateAuthToken(payload);
  return {
    Authorization: `Bearer ${token}`,
  };
}
