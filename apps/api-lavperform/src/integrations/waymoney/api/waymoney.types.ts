export interface WaymoneyCredentials {
  email: string;
  password: string;
}

export interface WaymoneyLoginResponse {
  token?: string;
}

export interface WaymoneyBranch {
  id: string;
  name?: string | null;
  timezone?: string | null;
}

export interface WaymoneyPayment {
  id: string;
  branchId?: string | null;
  clientId?: string | null;
  paymentMethod?: string | string[] | null;
  refundedAt?: string | null;
  source?: string | null;
  finalTotal?: number | null;
  discount?: number | null;
  createdAt?: string | null;
  machineName?: string | null;
  machineType?: string | null;
}

export interface WaymoneyPaymentsResponse {
  payments?: WaymoneyPayment[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface WaymoneyPackagePurchase {
  id: string;
  branchId?: string | null;
  clientId?: string | null;
  paymentMethod?: string | string[] | null;
  amount?: number | null;
  packageName?: string | null;
  createdAt?: string | null;
}

export interface WaymoneyPackagePurchasesResponse {
  packagePurchases?: WaymoneyPackagePurchase[];
  total?: number;
}

export interface WaymoneyClient {
  id?: string;
  name?: string | null;
  phone?: string | null;
  document?: string | null;
  email?: string | null;
}

const WAYMONEY_METHOD_LABELS: Record<string, string> = {
  CREDIT: 'Cartão de crédito',
  DEBIT: 'Cartão de débito',
  PIX: 'PIX',
  VOUCHER: 'Voucher',
};

export function waymoneyMethodCodes(value: unknown): string[] {
  if (typeof value === 'string') {
    const code = value.trim();
    return code ? [code] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function waymoneyPaymentLabel(method: unknown): string {
  const codes = waymoneyMethodCodes(method);
  const accepted = codes.filter((code) => WAYMONEY_METHOD_LABELS[code]);
  if (accepted.length > 0) {
    return accepted.map((code) => WAYMONEY_METHOD_LABELS[code]).join(' + ');
  }
  return codes.join(' + ');
}

export function isImportableCycle(payment: {
  paymentMethod?: unknown;
  refundedAt?: string | null;
  source?: string | null;
}): boolean {
  if (isFilled(payment.refundedAt) || payment.source === 'USER') {
    return false;
  }
  const codes = waymoneyMethodCodes(payment.paymentMethod);
  if (codes.includes('PACKAGE')) {
    return false;
  }
  return codes.some((code) => WAYMONEY_METHOD_LABELS[code] !== undefined);
}

export function isImportablePackagePurchase(purchase: {
  amount?: number | null;
  paymentMethod?: unknown;
}): boolean {
  if (typeof purchase.amount !== 'number' || purchase.amount <= 0) {
    return false;
  }
  return !waymoneyMethodCodes(purchase.paymentMethod).includes('POINTS');
}

function isFilled(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}
