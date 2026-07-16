/**
 * Canais de venda considerados marketplace para fins de deduplicacao de clientes.
 *
 * Em marketplaces, telefones costumam ser:
 * - Genericos/mascarados ("anonimizados" pela plataforma);
 * - Reutilizados entre varios clientes;
 * - Numeros internos do proprio marketplace (nao do consumidor final).
 *
 * Por isso, NAO usamos o telefone como identificador para deduplicar clientes
 * vindos desses canais; preferimos identificar por CPF quando disponivel ou,
 * na ausencia dele, criar um cliente novo sem telefone para evitar misturar
 * historicos de pessoas distintas.
 *
 * Cada parser/integrador pode mapear o nome do seu canal aqui. A lista deve
 * conter os valores normalizados (lowercase, sem espacos extras) que chegam
 * em `salesChannel` do payload de ingestao.
 */
export const MARKETPLACE_CHANNELS: ReadonlySet<string> = new Set([
  'ifood',
  'rappi',
  'uber_eats',
  'ubereats',
  'aiqfome',
  '99food',
  'mercado_livre',
  'james',
  'james_delivery',
  'goomer',
  'goomer_go',
  'delivery_much',
  'deliverymuch',
]);

/**
 * Retorna `true` quando o canal de vendas pertence a um marketplace conhecido.
 */
export function isMarketplaceChannel(channel?: string | null): boolean {
  if (!channel || typeof channel !== 'string') return false;
  const normalized = channel.toLowerCase().trim();
  if (!normalized) return false;
  return MARKETPLACE_CHANNELS.has(normalized);
}
