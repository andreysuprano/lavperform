export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');

export interface CompanyData {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyData {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
}

export interface UpdateCompanyData {
  name?: string;
  slug?: string;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
}

export interface CompanyRepositoryPort {
  create(data: CreateCompanyData): Promise<CompanyData>;
  findById(id: string): Promise<CompanyData | null>;
  findAll(): Promise<CompanyData[]>;
  update(id: string, data: UpdateCompanyData): Promise<CompanyData>;
  delete(id: string): Promise<void>;
}
