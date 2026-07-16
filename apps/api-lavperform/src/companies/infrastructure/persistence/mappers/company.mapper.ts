import { Company as PrismaCompany, Address as PrismaAddress } from '@prisma/client';
import { Company } from '../../../domain/company.entity';

type PrismaCompanyWithRelations = PrismaCompany & {
    address?: PrismaAddress | null;
    userCompanies?: any[];
    companySubscriptions?: any[];
    openingHours?: any[];
    // Add other relations as needed
};

export class CompanyMapper {
    static toDomain(prismaCompany: PrismaCompanyWithRelations): Company {
        const entity = new Company({
            id: prismaCompany.id,
            name: prismaCompany.name,
            cnpj: prismaCompany.cnpj,
            email: prismaCompany.email,
            phone: prismaCompany.phone,
            avatarUrl: prismaCompany.avatarUrl,
            state: prismaCompany.state,
            deletedAt: prismaCompany.deletedAt,
            slug: prismaCompany.slug,
            addressId: prismaCompany.addressId,
            businessPartnerId: prismaCompany.businessPartnerId,
            createdAt: prismaCompany.createdAt,
            updatedAt: prismaCompany.updatedAt,
        });

        if (prismaCompany.address) {
            entity.address = prismaCompany.address;
        }

        if (prismaCompany.userCompanies) {
            entity.userCompanies = prismaCompany.userCompanies;
        }

        if (prismaCompany.companySubscriptions) {
            entity.companySubscriptions = prismaCompany.companySubscriptions;
        }

        if (prismaCompany.openingHours) {
            entity.openingHours = prismaCompany.openingHours;
        }

        return entity;
    }
}
