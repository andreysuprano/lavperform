export interface MaxlavOrdersQueryParams {
  page: number;
  limit: number;
  mask: boolean;
  showName: boolean;
  period?: string;
  beginDate?: string;
  endDate?: string;
}

export interface MaxlavMachineInfo {
  machineCode: string;
  type: 'washer' | 'dryer' | string;
  price: number;
  _id?: string;
}

export interface MaxlavMachine {
  machineCode: string;
  type: 'washer' | 'dryer' | string;
  price: number;
  store: string;
  isActive: boolean;
  state: string;
  id: string;
}

export interface MaxlavStore {
  id: string;
  fullName: string;
  nickName: string;
  cnpj: string;
  franchise: string;
  isActive: boolean;
  address?: string;
  cityState?: string;
}

export interface MaxlavCustomer {
  id: string;
  fullName: string;
  email: string | null;
  cellphone: string | null;
  documentId: string | null;
  createdAt: string | null;
  lastPurchaseDt: string | null;
  isActive?: boolean;
}

export interface MaxlavCustomerStore {
  totalPurchases: number;
  totalAmount: number;
  totalAmountPay: number;
  totalVisits: number;
  lastPurchaseDt: string | null;
}

export interface MaxlavOrder {
  id: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  amountPay: number;
  paymentType: string;
  cardBrand: string | null;
  paymentReceiptCode: string | null;
  rechargeType: string;
  isActive: boolean;
  isVoucherUsed: boolean;
  isBalancePurchase: boolean;
  customer: MaxlavCustomer;
  store: MaxlavStore;
  machines: MaxlavMachine[];
  machinesInfo: MaxlavMachineInfo[];
  franchise: string;
  customerStore?: MaxlavCustomerStore;
  receiptSentByEmail?: string | null;
}

export interface MaxlavOrdersResponse {
  results: MaxlavOrder[];
}
