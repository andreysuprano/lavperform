/**
 * Mesmas colunas do CSV modelo usado em ImportCustomersWizard.
 * A data é gravada em UTC (YYYY-MM-DD), igual a `new Date('1990-01-01')` na importação.
 */
export const CUSTOMER_IMPORT_CSV_HEADER =
  'nome,telefone,email,data_nascimento,data_primeira_venda,genero,observacoes,valor_medio_ticket,rua,numero,complemento,bairro,cidade,estado,cep';

export interface CustomerImportCsvSource {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: Date | string | null;
  firstOrderDate?: Date | string | null;
  gender?: string | null;
  observations?: string | null;
  averageTicket?: number | null;
  address?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  } | null;
}

export function customersToImportTable(
  customers: CustomerImportCsvSource[],
): string[][] {
  const rows = [...customers].sort((left, right) =>
    (left.name ?? '').localeCompare(right.name ?? '', 'pt-BR', {
      sensitivity: 'base',
    }),
  );

  return [
    CUSTOMER_IMPORT_CSV_HEADER.split(','),
    ...rows.map((customer) => [
      text(customer.name),
      text(customer.phone),
      text(customer.email),
      formatImportDate(customer.birthDate),
      formatImportDate(customer.firstOrderDate),
      text(customer.gender),
      text(customer.observations),
      formatTicket(customer.averageTicket),
      text(customer.address?.street),
      text(customer.address?.number),
      text(customer.address?.complement),
      text(customer.address?.neighborhood),
      text(customer.address?.city),
      text(customer.address?.state),
      text(customer.address?.zipCode),
    ]),
  ];
}

export function customersToImportCsv(customers: CustomerImportCsvSource[]): string {
  const lines = customersToImportTable(customers).map((row) => toCsvLine(row));
  return `\uFEFF${lines.join('\n')}\n`;
}

function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function formatImportDate(value: Date | string | null | undefined): string {
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

function toCsvLine(values: string[]): string {
  return values.map(escapeCsvCell).join(',');
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
