[← Documentation Home](../README.md)

# Repository Pattern - Code Examples

Complete implementation examples following the Repository Pattern with Clean Architecture.

---

### Complete Example: Auth Module

#### File: `src/auth/domain/user.entity.ts`
```typescript
import { AccessRule } from '../interfaces/jwt-payload.interface';

export interface UserCompanyData {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    avatarUrl: string | null;
    slug: string | null;
  };
}

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly password: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly userCompanies?: UserCompanyData[],
    public readonly accessRules?: AccessRule[],
  ) {}

  hasCompanies(): boolean {
    return this.userCompanies !== undefined && this.userCompanies.length > 0;
  }

  getActiveCompany(): UserCompanyData['company'] | null {
    if (!this.hasCompanies()) {
      return null;
    }
    return this.userCompanies![0].company;
  }
}
```

#### File: `src/auth/domain/user.repository.interface.ts`
```typescript
import { UserEntity } from './user.entity';

export interface IUserRepository {
  /**
   * Finds a user by email with all their companies and access rules
   */
  findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null>;

  /**
   * Finds a user by email without relations
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Updates a user's password
   */
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}
```

#### File: `src/auth/infrastructure/persistence/mappers/user.mapper.ts`
```typescript
import { User, UserCompany, Company, AccessRule } from '@prisma/client';
import { UserEntity, UserCompanyData } from '../../../domain/user.entity';
import { AccessRule as AccessRuleInterface } from '../../../interfaces/jwt-payload.interface';

type PrismaUserWithRelations = User & {
  userCompanies?: (UserCompany & { company: Company })[];
  accessRules?: AccessRule[];
};

export class UserMapper {
  static toDomain(prismaUser: PrismaUserWithRelations): UserEntity {
    const userCompanies: UserCompanyData[] | undefined = prismaUser.userCompanies?.map(
      (uc) => ({
        id: uc.id,
        companyId: uc.companyId,
        company: {
          id: uc.company.id,
          name: uc.company.name,
          avatarUrl: uc.company.avatarUrl,
          slug: uc.company.slug,
        },
      }),
    );

    const accessRules: AccessRuleInterface[] | undefined = prismaUser.accessRules?.map(
      (rule) => ({
        module: rule.module,
        action: rule.action,
      }),
    );

    return new UserEntity(
      prismaUser.id,
      prismaUser.email,
      prismaUser.name,
      prismaUser.phone,
      prismaUser.password,
      prismaUser.createdAt,
      prismaUser.updatedAt,
      userCompanies,
      accessRules,
    );
  }

  static toDomainArray(prismaUsers: PrismaUserWithRelations[]): UserEntity[] {
    return prismaUsers.map((user) => this.toDomain(user));
  }
}
```

#### File: `src/auth/infrastructure/persistence/prisma-user.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository } from '../../domain/user.repository.interface';
import { UserEntity } from '../../domain/user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
        accessRules: true,
      },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
```

#### File: `src/auth/auth.service.ts` (Refactored)
```typescript
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { IUserRepository } from './domain/user.repository.interface';
import { IConfirmationCodeRepository } from './domain/confirmation-code.repository.interface';
import { UserEntity } from './domain/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IConfirmationCodeRepository')
    private readonly confirmationCodeRepository: IConfirmationCodeRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity> {
    if (!email || !password) {
      throw new UnauthorizedException('Email e senha são obrigatórios');
    }

    const user = await this.userRepository.findByEmailWithCompaniesAndRules(email);

    if (!user) {
      throw new UnauthorizedException('Usuário ou senha incorretos.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Usuário ou senha incorretos.');
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const activeCompany = user.getActiveCompany();
    if (!activeCompany) {
      throw new UnauthorizedException('Usuário não está vinculado a nenhuma empresa');
    }

    const payload: JwtPayload = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      companyId: activeCompany.id,
      // ... rest of payload
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // ... other methods
}
```

#### File: `src/auth/auth.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaConfirmationCodeRepository } from './infrastructure/persistence/prisma-confirmation-code.repository';

@Module({
  imports: [PrismaModule, JwtModule.register({ /* ... */ })],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'IConfirmationCodeRepository',
      useClass: PrismaConfirmationCodeRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

---


## See Also

- [Repository Pattern Guide](../guides/repository-pattern-guide.md) - Concepts, process, and best practices
- [Testing Guide](../guides/testing-guide.md) - How to test repositories
- [Technical Backlog](../planning/technical-backlog.md) - Repository pattern migration status

---
**Navigation:** [← Home](../README.md) | [Migration Guide ←](../guides/repository-pattern-guide.md)
