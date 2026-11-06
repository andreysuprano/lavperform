/**
 * CSV do admin com o cadastro das lavanderias.
 * Inclui ativas, inativas, pendentes e excluídas (soft delete).
 * Datas em UTC (YYYY-MM-DD).
 */
export const ADMIN_COMPANIES_CSV_HEADER =
  'nome,cnpj,email,telefone,status,modelo,parceiro,slug,cidade,uf,bairro,cep,rua,numero,complemento,data_cadastro,data_exclusao';

const DELETED_SUFFIX = /__deleted__.+$/;

export interface AdminCompanyCsvSource {
  name?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  deletedAt?: Date | string | null;
  serviceModel?: string | null;
  slug?: string | null;
  createdAt?: Date | string | null;
  address?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  } | null;
  businessPartner?: {
    name?: string | null;
  } | null;
}

export function adminCompanyStatus(company: AdminCompanyCsvSource): string {
  if (company.deletedAt) return 'deletado';

  switch (company.state) {
    case 'ACTIVE':
      return 'ativo';
    case 'INACTIVE':
      return 'inativo';
    case 'PENDING':
      return 'pendente';
    default:
      return company.state ? company.state.toLowerCase() : '';
  }
}

export function adminCompanyCells(company: AdminCompanyCsvSource): string[] {
  return [
    text(company.name),
    withoutDeletedSuffix(company.cnpj),
    text(company.email),
    text(company.phone),
    adminCompanyStatus(company),
    serviceModelLabel(company.serviceModel),
    text(company.businessPartner?.name),
    withoutDeletedSuffix(company.slug),
    text(company.address?.city),
    text(company.address?.state),
    text(company.address?.neighborhood),
    text(company.address?.zipCode),
    text(company.address?.street),
    text(company.address?.number),
    text(company.address?.complement),
    formatDate(company.createdAt),
    formatDate(company.deletedAt),
  ];
}

export function formatAdminCompaniesCsvChunk(
  companies: AdminCompanyCsvSource[],
): string {
  if (companies.length === 0) return '';

  return `${companies.map((company) => toCsvLine(adminCompanyCells(company))).join('\n')}\n`;
}

export function adminCompaniesCsvHeader(): string {
  return `\uFEFF${ADMIN_COMPANIES_CSV_HEADER}\n`;
}

function serviceModelLabel(value: string | null | undefined): string {
  if (value === 'SELF_SERVICE') return 'Autoatendimento';
  if (value === 'CONVENTIONAL') return 'Convencional';
  return text(value);
}

function withoutDeletedSuffix(value: string | null | undefined): string {
  return text(value).replace(DELETED_SUFFIX, '');
}

function text(value: string | null | undefined): string {
  return value ?? '';
}

function toCsvLine(values: string[]): string {
  return values.map(escapeCsvCell).join(',');
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const textValue = String(value);
  if (/[",\r\n]/.test(textValue)) {
    return `"${textValue.replace(/"/g, '""')}"`;
  }
  return textValue;
}
