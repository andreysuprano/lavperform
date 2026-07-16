import { User, UserCompany, Company, AccessRule, Address } from '@prisma/client';
import { UserEntity, UserCompanyData } from '../../../domain/user.entity';
import { AccessRule as AccessRuleInterface } from '../../../interfaces/jwt-payload.interface';

type PrismaUserWithRelations = User & {
  userCompanies?: (UserCompany & {
    company: Company & {
      address?: Address | null;
    };
  })[];
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
          state: uc.company.state,
          cnpj: uc.company.cnpj,
          email: uc.company.email,
          phone: uc.company.phone,
          address: uc.company.address ? {
            id: uc.company.address.id,
            street: uc.company.address.street,
            number: uc.company.address.number,
            complement: uc.company.address.complement,
            neighborhood: uc.company.address.neighborhood,
            city: uc.company.address.city,
            state: uc.company.address.state,
            zipCode: uc.company.address.zipCode,
          } : null,
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
