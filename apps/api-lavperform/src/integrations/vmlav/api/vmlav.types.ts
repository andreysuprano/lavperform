/**
 * Interfaces e tipos para integração com API VM Lav
 */

/**
 * Parâmetros para buscar vendas na API VM Lav
 */
export interface GetSalesParams {
  dataInicio: string; // ISO 8601 format: 2026-02-01T00:00:00Z
  dataTermino: string; // ISO 8601 format: 2026-03-01T23:59:59Z
  somenteSucesso?: boolean;
  cnpj: string;
  pagina?: number;
  quantidade?: number;
}

/**
 * Documento de identificação (CPF ou CNPJ)
 */
export interface Documento {
  tipo: 'CPF' | 'CNPJ';
  identificador: string;
}

/**
 * Item do pedido na venda
 */
export interface ItemPedido {
  tipoServico: string;
  servico: string;
  maquina: string;
  valor: number;
  valorSemDesconto: number;
}

/**
 * Pedido da venda
 */
export interface Pedido {
  itens: ItemPedido[];
}

/**
 * Dados de uma venda retornada pela API VM Lav
 */
export interface VmLavSale {
  data: string;
  empresa: string;
  documentoEmpresa: Documento;
  idLavanderia: number;
  idCliente: number;
  lavanderia: string;
  cpfCliente: string;
  nomeCliente: string;
  telefoneCliente: string | null;
  emailCliente: string;
  equipamento: string;
  tipoPagamento: string;
  status: string;
  codErro: string;
  erro: string | null;
  autorizador: string | null;
  provedor: string;
  adquirente: string;
  voucher: string | null;
  cupom: string | null;
  valor: number;
  valorSemDesconto: number;
  ciclos: number;
  tipoCartao: string;
  bandeiraCartao: string;
  pedido: Pedido;
  dtaNascimento: string;
  requisicao: string;
  codigoAutorizacaoEmissor: string;
  nomeCategoriaVoucher: string | null;
  idVenda: number;
  creditoReal: boolean;
}

/**
 * Resposta da API de vendas (array direto)
 */
export type VmLavSalesResponse = VmLavSale[];

/**
 * Dados de um cliente retornado pela API VM Lav
 */
export interface VmLavCustomer {
  idCliente: number;
  nomeCliente: string;
  telefoneCliente?: string;
  emailCliente?: string;
  cpfCliente?: string;
  dtaNascimento?: string;
}

/**
 * Dados detalhados de um cliente retornado pela API VM Lav (endpoint de clientes)
 */
export interface VmLavCustomerDetail {
  id: number;
  nome: string;
  dataNascimento: string;
  cpf: string;
  telefone: string;
  email: string;
  genero: 'M' | 'F' | string;
  dataCadastro: string;
  qtdCompras: number;
  valorTotalCompras: number;
  primeiraCompra: string;
  ultimaCompra: string;
}

/**
 * Parâmetros para buscar cliente na API VM Lav
 */
export interface GetCustomerParams {
  CPF?: string;
  pagina?: number;
  quantidade?: number;
  campoOrdenacao?: string;
  direcaoOrdenacao?: 'asc' | 'desc';
}

/**
 * Resposta da API de clientes (array de clientes)
 */
export type VmLavCustomersResponse = VmLavCustomerDetail[];

/**
 * Configuração de integração VM Lav por empresa
 */
export interface VmLavIntegrationConfig {
  enabled: boolean;
  apiKey: string;
  cnpj: string;
  lastSyncDate?: Date;
}

/**
 * Resposta da API para detalhes do cliente
 */
export interface VmLavCustomerResponse {
  customer: VmLavCustomer;
  success: boolean;
}
