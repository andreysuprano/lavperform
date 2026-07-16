/**
 * Utilitarios para comparar similaridade entre nomes de clientes.
 *
 * Usado durante a deduplicacao de clientes na ingestao de pedidos: quando
 * encontramos um cliente existente pelo telefone ou CPF, queremos confirmar
 * que se trata da mesma pessoa antes de associar o pedido. Se os nomes forem
 * suficientemente diferentes, e mais seguro criar um cliente novo (sem o
 * identificador conflitante) do que misturar historicos de pessoas distintas.
 */

const SIMILARITY_THRESHOLD = 0.5;

/**
 * Normaliza um nome para comparacao: minusculas, sem acentos, sem caracteres
 * especiais e com espacos colapsados.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distancia de Levenshtein entre duas strings (numero minimo de edicoes).
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    new Array<number>(a.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Similaridade Levenshtein normalizada (1 = identico, 0 = totalmente diferente).
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Compara similaridade considerando que nomes podem estar abreviados ou ter
 * ordem de tokens trocada (ex: "Joao Silva" vs "J. Silva" vs "Silva, Joao").
 *
 * Estrategia:
 * 1. Match exato dos primeiros nomes vale como similaridade 1.
 * 2. Se o nome curto for prefixo/abreviatura do longo (ex: "j" para "joao"),
 *    consideramos como token equivalente.
 * 3. Caso contrario, usamos a similaridade Levenshtein da string inteira.
 */
function tokenAwareSimilarity(a: string, b: string): number {
  const tokensA = a.split(' ').filter(Boolean);
  const tokensB = b.split(' ').filter(Boolean);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const firstA = tokensA[0];
  const firstB = tokensB[0];
  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];

  let bonus = 0;

  if (firstA === firstB) {
    bonus += 0.4;
  } else if (firstA.length === 1 && firstB.startsWith(firstA)) {
    bonus += 0.3;
  } else if (firstB.length === 1 && firstA.startsWith(firstB)) {
    bonus += 0.3;
  } else if (levenshteinSimilarity(firstA, firstB) >= 0.7) {
    bonus += 0.2;
  }

  if (tokensA.length > 1 && tokensB.length > 1 && lastA === lastB) {
    bonus += 0.3;
  }

  const fullSimilarity = levenshteinSimilarity(a, b);

  return Math.min(1, Math.max(fullSimilarity, bonus));
}

/**
 * Calcula a similaridade entre dois nomes (0 a 1).
 *
 * Retorna 0 quando algum dos nomes e vazio.
 */
export function nameSimilarity(
  nameA: string | null | undefined,
  nameB: string | null | undefined,
): number {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return tokenAwareSimilarity(a, b);
}

/**
 * Retorna `true` quando os nomes sao suficientemente parecidos para serem
 * tratados como a mesma pessoa.
 *
 * O threshold default e 0.5 (50%). Nomes vazios sao considerados como nao
 * conflitantes (retorna `true`), ja que nao temos evidencia contra o match.
 */
export function isSimilarName(
  nameA: string | null | undefined,
  nameB: string | null | undefined,
  threshold: number = SIMILARITY_THRESHOLD,
): boolean {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return true;
  return nameSimilarity(a, b) >= threshold;
}

export const NAME_SIMILARITY_DEFAULT_THRESHOLD = SIMILARITY_THRESHOLD;
