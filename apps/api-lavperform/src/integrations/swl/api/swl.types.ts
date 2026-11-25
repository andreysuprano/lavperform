export interface SwlTelefone {
  e164?: string | null;
  numero?: string | null;
}

export interface SwlEndereco {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
}

export interface SwlCentroCusto {
  id: number;
  nome?: string | null;
}

export interface SwlLavanderia {
  id: number;
  nome?: string | null;
  centrosCusto?: SwlCentroCusto[] | null;
}

export interface SwlCliente {
  id: number;
  nome?: string | null;
  documento?: string | null;
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

export interface SwlAtendimentoDatas {
  abertura?: string | null;
}

export interface SwlAtendimentoValores {
  bruto?: string | null;
  desconto?: string | null;
  voucherFidelidade?: string | null;
  descontoPercentual?: string | null;
  liquido?: string | null;
  pago?: string | null;
  creditoUtilizado?: string | null;
  entregaExpressa?: string | null;
}

export interface SwlAtendimentoItem {
  id: number;
  servicoId?: number | null;
  descricao?: string | null;
  quantidade?: string | null;
  unidade?: string | null;
  valorUnitario?: string | null;
  valorTotal?: string | null;
}

export interface SwlPagamento {
  id: number;
  situacao?: string | null;
  forma?: string | null;
  valor?: string | null;
  valorAposTaxa?: string | null;
  registradoEm?: string | null;
}

export interface SwlAtendimento {
  id: number;
  situacao?: string | null;
  situacaoPagamento?: string | null;
  clienteId?: number | null;
  centroCustoId?: number | null;
  datas?: SwlAtendimentoDatas | null;
  valores?: SwlAtendimentoValores | null;
  itens?: SwlAtendimentoItem[] | null;
  pagamentos?: SwlPagamento[] | null;
  atualizadoEm?: string | null;
}

export interface SwlPaginated<T> {
  data: T[];
  nextCursor: string | null;
}
