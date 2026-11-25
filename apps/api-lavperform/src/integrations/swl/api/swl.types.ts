export interface SwlTelefone {
  original: string | null;
  e164: string | null;
}

export interface SwlEndereco {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

export interface SwlCentroDeCusto {
  id: number;
  nome: string | null;
  ativo: boolean;
  endereco?: string | null;
}

export interface SwlLavanderia {
  nome: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: SwlTelefone | null;
  celular?: SwlTelefone | null;
  endereco?: string | null;
  centrosDeCusto: SwlCentroDeCusto[];
}

export type SwlTipoDocumento = 'CPF' | 'CNPJ';

export interface SwlCliente {
  id: number;
  nome?: string | null;
  documento?: string | null;
  tipoDocumento?: SwlTipoDocumento | null;
  email?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  celular?: SwlTelefone | null;
  telefone?: SwlTelefone | null;
  endereco?: SwlEndereco | null;
  ativo?: boolean | null;
  whatsappOptin?: boolean | null;
  primeiroAtendimentoEm?: string | null;
  quantidadeAtendimentos?: number | null;
  ticketMedio?: string | null;
  atualizadoEm?: string | null;
}

export interface SwlClienteExcluido {
  id: number;
  excluidoEm?: string | null;
}

export type SwlSituacao = 'ATIVO' | 'INATIVO' | 'EXCLUIDO';
export type SwlStatusPagamento = 'PAGO' | 'PARCIAL' | 'EM_ABERTO';
export type SwlStatusEntrega = 'ENTREGUE' | 'PARCIAL' | 'ESTOQUE';

export interface SwlAtendimentoStatus {
  pagamento: SwlStatusPagamento;
  entrega: SwlStatusEntrega;
}

export interface SwlAtendimentoDatas {
  abertura: string | null;
  previsaoEntrega?: string | null;
  entrega?: string | null;
}

export interface SwlAtendimentoValores {
  quantidadePecas?: number | null;
  totalItens?: number | null;
  total?: string | null;
  descontoValor?: string | null;
  descontoPercentual?: string | null;
  voucherFidelidade?: string | null;
  creditoUtilizado?: string | null;
  entregaExpressa?: string | null;
  liquido?: string | null;
  pago?: string | null;
}

export interface SwlAtendimentoItem {
  id: number;
  itemId?: number | null;
  descricao?: string | null;
  unidadeMedida?: string | null;
  quantidade?: string | null;
  valorUnitario?: string | null;
  valorTotal?: string | null;
  entregaExpressa?: boolean | null;
}

export interface SwlPagamento {
  id: number;
  data?: string | null;
  registradoEm?: string | null;
  valor?: string | null;
  valorAposTaxa?: string | null;
  forma?: string | null;
  situacao?: string | null;
}

export interface SwlAtendimento {
  id: number;
  situacao: SwlSituacao;
  concluido: boolean;
  status: SwlAtendimentoStatus;
  clienteId?: number | null;
  centroDeCustoId?: number | null;
  datas: SwlAtendimentoDatas;
  valores: SwlAtendimentoValores;
  itens: SwlAtendimentoItem[];
  pagamentos: SwlPagamento[];
  atualizadoEm?: string | null;
}

export interface SwlPagination {
  nextCursor: string | null;
  limit: number;
}

export interface SwlPaginated<T> {
  data: T[];
  pagination: SwlPagination;
}
