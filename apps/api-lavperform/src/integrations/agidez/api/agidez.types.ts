export interface AgidezCredentials {
  apiPassword: string;
  accountCode: number;
  storeCode: number;
  token: string;
}

export interface AgidezCliente {
  CodigoLoja: number;
  CodigoCliente: number;
  DDDCelular: string | null;
  Celular: string | null;
  Nome: string | null;
  Sobrenome: string | null;
  DataCadastro: string | null;
  DataUltimaVisita: string | null;
  DataNasimento: string | null;
}

export interface AgidezTicket {
  CodigoLoja: number;
  CodigoTicket: number;
  CodigoCliente: number;
  NomeCliente: string | null;
  DDDCelular: string | null;
  Celular: string | null;
  DataEmissao: string;
  QuantidadeTotalPecas: number;
  QuantidadeTotalPecasEntregues: number;
  QuantidadeTotalServicos: number;
  ValorTotalServicos: number;
  DescontoTotalServicos: number;
  ValorTotalProdutos: number;
  DescontoTotalProdutos: number;
}

export interface AgidezServico {
  CodigoLoja: number;
  CodigoTicket: number;
  TicketPecaIndividual: number;
  Sequencia: number;
  ValorUnitario: number;
  DescontoUnitario: number;
  DataDisponibilizacao: string | null;
  ValorUnitarioComAcrescimoDescontoTicket: number;
  NomeServico: string | null;
}

export interface AgidezProduto {
  CodigoLoja?: number;
  CodigoTicket?: number;
  Codigo?: number;
  NomeProduto?: string | null;
  Quantidade?: number;
  ValorUnitario?: number;
  ValorUnitarioComAcrescimoDescontoTicket?: number;
  DescontoUnitario?: number;
}

export interface AgidezDaySales {
  tickets: AgidezTicket[];
  services: AgidezServico[];
  products: AgidezProduto[];
}
