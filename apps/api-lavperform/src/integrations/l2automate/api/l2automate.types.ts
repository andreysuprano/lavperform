export interface L2AutomateSalesQueryParams {
  startDate: string;
  endDate: string;
  limit?: number;
  offset?: number;
}

export interface L2AutomatePayment {
  method: string | null;
  status: string | null;
}

export interface L2AutomateCustomer {
  id: string;
  name: string;
  document: string | null;
  mobile: string | null;
  birthDate: string | null;
  registeredAt: string | null;
}

export interface L2AutomateSaleItem {
  description: string;
  quantity: number;
  unitPrice: number;
  observation: string | null;
}

export interface L2AutomateSale {
  id: string;
  createdAt: string;
  description: string;
  amount: number;
  count: number;
  origin: string;
  dayOfWeek: string;
  hourOfDay: number;
  payment: L2AutomatePayment;
  customer: L2AutomateCustomer;
  items: L2AutomateSaleItem[];
}

export interface L2AutomateSalesPeriod {
  from: string;
  to: string;
}

export interface L2AutomateSalesPagination {
  limit: number;
  offset: number;
  returned: number;
  total: number;
}

export interface L2AutomateSalesSummary {
  totalSales: number;
  totalAmount: number;
  totalTransactions: number;
  averageTicket: number;
}

export interface L2AutomateSalesResponse {
  success: boolean;
  period: L2AutomateSalesPeriod;
  pagination: L2AutomateSalesPagination;
  summary: L2AutomateSalesSummary;
  sales: L2AutomateSale[];
}
