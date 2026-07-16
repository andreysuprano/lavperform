export interface CreateCustomerDto {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address: string;
  province: string;
  postalCode: string;
  mobilePhone: string;
  addressNumber: string;
  complement: string;
  company: string;
}

export interface AsaasCreditCardDto {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfoDto {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface CreateSubscriptionDto {
  billingType: string;
  cycle: string;
  value: number;
  customer: string;
  nextDueDate: string;
  description: string;
  maxPayments: number;
  creditCard?: AsaasCreditCardDto;
  creditCardHolderInfo?: AsaasCreditCardHolderInfoDto;
  remoteIp?: string;
}

export interface CreatePaymentDto {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
}

export interface AsaasCustomerResponse {
  id: string;
  [key: string]: unknown;
}

export interface AsaasPaymentResponse {
  id: string;
  [key: string]: unknown;
}

export interface UpdateSubscriptionDto {
  billingType?: string;
  cycle?: string;
  value?: number;
  nextDueDate?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  updatePendingPayments?: boolean;
  maxPayments?: number;
}

export interface UpdatePaymentDto {
  billingType?: string;
  value?: number;
  dueDate?: string;
  description?: string;
}

export interface ReceivePaymentInCashDto {
  paymentDate: string;
  value: number;
  notifyCustomer?: boolean;
}

export interface RefundPaymentDto {
  value?: number;
  description?: string;
}
