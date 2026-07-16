/** Payload bruto do webhook Consumer (ERP)   campos usados no mapeamento para Order. */

export interface ConsumerWebhookPedido {
  codigo?: string;
  numero?: string;
  dataabertura?: string;
  datafechamento?: string | null;
  totalservico?: string | null;
  totalacrescimo?: string | null;
  valortotal?: string;
  totaldesconto?: string | null;
}

export interface ConsumerWebhookCliente {
  codigo?: string;
  nome?: string;
  email?: string | null;
  foneprincipal?: string | null;
  fonecelular?: string | null;
  cnpjoucpf?: string | null;
}

export interface ConsumerWebhookEndereco {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  referencia?: string | null;
}

export interface ConsumerWebhookDelivery {
  codigo?: string;
  status?: string;
  frete?: string | null;
  observacao?: string | null;
  total?: string;
  /** Logradouro (string) quando o endereço vem só no bloco delivery. */
  endereco?: string | null;
  endereconumero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  cep?: string | null;
  uf?: string | null;
}

export interface ConsumerWebhookItemProduto {
  codigo?: string | null;
  nome?: string | null;
}

export interface ConsumerWebhookItem {
  codigo?: string;
  codigopedido?: string;
  codigoproduto?: string | null;
  quantidade?: string;
  valorunitario?: string;
  valortotal?: string;
  nomeproduto?: string;
  detalhes?: string | null;
  codigopai?: string | null;
  codigoprodutodetalhe?: string | null;
  produto?: ConsumerWebhookItemProduto;
}

export interface ConsumerWebhookPayload {
  tipo?: string;
  pedido?: ConsumerWebhookPedido;
  cliente?: ConsumerWebhookCliente;
  endereco?: ConsumerWebhookEndereco;
  delivery?: ConsumerWebhookDelivery;
  itens?: ConsumerWebhookItem[];
}
