export interface EssenceCredentials {
  apiPassword: string;
  storeGuid: string;
  integrationKey: string;
}

export interface EssenceTicketCliente {
  CPF?: string | null;
  CNPJ?: string | null;
  Nome?: string | null;
  Codigo?: string | null;
}

export interface EssenceTicket {
  Saldo?: number;
  Coleta?: unknown;
  Status?: string | null;
  Cliente?: EssenceTicketCliente;
  Entrega?: unknown;
  Desconto?: number;
  PrecoBase?: number;
  Sequencia: number;
  ValorPago?: number;
  Habilitado?: number;
  PrecoFinal?: number;
  Quantidade?: number;
  DataCriacao: string;
  DataCancelado?: string | null;
  DataLancamento?: string | null;
  MotivoCancelado?: string | null;
}

export interface EssenceClienteEndereco {
  CEP?: string | null;
  Bairro?: string | null;
  Cidade?: string | null;
  Estado?: string | null;
}

export interface EssenceCliente {
  RG?: string | null;
  CPF?: string | null;
  CNPJ?: string | null;
  Nome?: string | null;
  Codigo?: string | null;
  Telefones?: Array<string | null>;
  Habilitado?: number;
  Nascimento?: string | null;
  DataCadastro?: string | null;
  Enderecos?: EssenceClienteEndereco[];
}