export interface WindelCredentials {
  email: string;
  password: string;
}

export interface WindelLoginResponse {
  token?: string;
  mfaObrigatorio?: boolean;
}

export interface WindelPerson {
  id?: number;
  nome?: string;
  fantasia?: string;
  telefone?: string;
  telefoneContato?: string;
  email?: string;
  cpfCnpj?: string;
}

export interface WindelMovDoc {
  xProd?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
  servico?: boolean;
}

export interface WindelPaymentDoc {
  valor?: number;
  formaDePagamento?: { nome?: string };
}

export interface WindelServiceOrderDetail {
  id: number;
  numero: number;
  serie?: string;
  situacao?: string;
  valorTotal?: number;
  valorDesconto?: number;
  empresaId?: number;
  pessoaId?: number | null;
  pessoaNome?: string;
  pessoaCpfCnpj?: string;
  createdAt: string;
  movDocs?: WindelMovDoc[];
  formaDePagamentoDocs?: WindelPaymentDoc[];
  pessoa?: { id?: number; nome?: string; cpfCnpj?: string } | null;
}

export interface WindelServiceOrderSummary {
  id: number;
  numero?: number;
  serie?: string;
  situacao?: string;
  createdAt?: string;
  pessoa?: { id?: number } | null;
}

export interface WindelListResponse<T = WindelServiceOrderSummary> {
  list: T[];
  count: number;
}
