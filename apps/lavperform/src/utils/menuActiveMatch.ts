/** Melhor match entre rotas quando um href é prefixo de outro (ex.: /foodads vs /foodads/overview). */
export function getLongestPrefixLinkMatch<T extends { href: string }>(
  links: T[] | undefined,
  pathname: string
): T | undefined {
  if (!links?.length) return undefined
  let best: T | undefined
  let bestLen = -1
  for (const link of links) {
    if (pathname.startsWith(link.href) && link.href.length > bestLen) {
      best = link
      bestLen = link.href.length
    }
  }
  return best
}
