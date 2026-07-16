export interface CiccloSalesQueryParams {
  email: string;
  password: string;
  dateFrom: string;
  dateTo: string;
}

export interface CiccloPayment {
  /** Pode vir nulo quando a Cicclo não informa o meio de pagamento */
  method: string | null;
  authCode: string | null;
  creditCardBrand: string | null;
  creditCardNumber: string | null;
  couponCode: string | null;
  voucherCode: string | null;
}

export interface CiccloChannels {
  pos: boolean;
  app: boolean;
  totem: boolean;
  admin: boolean;
}

export interface CiccloStore {
  name: string;
  document: string;
}

export interface CiccloCustomer {
  id: number;
  name: string;
  document: string | null;
  email: string | null;
  mobile: string | null;
  birthDate: string | null;
  age: number | null;
  postalCode: string | null;
  registeredAt: string | null;
}

export interface CiccloSale {
  id: number;
  createdAt: string;
  description: string;
  machineType: string;
  amount: number;
  count: number;
  origin: string;
  dayOfWeek: string;
  hourOfDay: number;
  payment: CiccloPayment;
  channels: CiccloChannels;
  store: CiccloStore;
  customer: CiccloCustomer;
}

export interface CiccloSalesPeriod {
  from: string;
  to: string;
}

export interface CiccloSalesPagination {
  limit: number;
  offset: number;
  returned: number;
}

export interface CiccloSalesSummary {
  totalSales: number;
  totalAmount: number;
  totalTransactions: number;
  averageTicket: number;
}

export interface CiccloSalesResponse {
  success: boolean;
  period: CiccloSalesPeriod;
  pagination: CiccloSalesPagination;
  summary: CiccloSalesSummary;
  sales: CiccloSale[];
}

export interface CiccloIntegrationConfig {
  email: string;
  password: string;
}
