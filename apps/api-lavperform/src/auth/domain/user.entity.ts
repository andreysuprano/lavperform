import { AccessRule } from '../interfaces/jwt-payload.interface';

export interface CompanyAddress {
  id: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

export interface UserCompanyData {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    avatarUrl: string | null;
    slug: string | null;
    state?: string;
    cnpj?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: CompanyAddress | null;
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
