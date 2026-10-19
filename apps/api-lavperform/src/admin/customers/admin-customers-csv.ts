/**
 * CSV do admin para uso comercial: contato, lavanderia e dados úteis da base.
 * Datas em UTC (YYYY-MM-DD).
 */
export const ADMIN_CUSTOMERS_CSV_HEADER =
  'lavanderia,nome,telefone,email,cpf,data_nascimento,genero,whatsapp_optin,whatsapp_verificado,classificacao,ticket_medio,data_primeira_venda,data_ultima_venda,cidade,estado,bairro,cep,rua,numero,complemento,observacoes';

export interface AdminCustomerCsvSource {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  birthDate?: Date | string | null;
  gender?: string | null;
  whatsappOptin?: boolean | null;
  whatsappVerified?: boolean | null;
  rfvClassification?: string | null;
  averageTicket?: number | null;
  firstOrderDate?: Date | string | null;
  lastOrderDate?: Date | string | null;
  observations?: string | null;
  address?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  } | null;
  company?: {
    name?: string | null;
  } | null;
}

export function adminCustomerCells(customer: AdminCustomerCsvSource): string[] {
  return [
    text(customer.company?.name),
    text(customer.name),
    text(customer.phone),
    text(customer.email),
    text(customer.cpf),
    formatDate(customer.birthDate),
    text(customer.gender),
    formatYesNo(customer.whatsappOptin),
    formatYesNo(customer.whatsappVerified),
    text(customer.rfvClassification),
    formatTicket(customer.averageTicket),
    formatDate(customer.firstOrderDate),
    formatDate(customer.lastOrderDate),
    text(customer.address?.city),
    text(customer.address?.state),
    text(customer.address?.neighborhood),
    text(customer.address?.zipCode),
    text(customer.address?.street),
    text(customer.address?.number),
    text(customer.address?.complement),
    text(customer.observations),
  ];
}

export function formatAdminCustomersCsvChunk(
  customers: AdminCustomerCsvSource[],
): string {
  if (customers.length === 0) return '';

  return `${customers.map((customer) => toCsvLine(adminCustomerCells(customer))).join('\n')}\n`;
}

export function adminCustomersCsvHeader(): string {
  return `\uFEFF${ADMIN_CUSTOMERS_CSV_HEADER}\n`;
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

function formatTicket(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  return String(value);
}

function formatYesNo(value: boolean | null | undefined): string {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '';
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
