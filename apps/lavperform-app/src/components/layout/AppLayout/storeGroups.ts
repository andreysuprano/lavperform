export function initials(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[\s—–-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '—')
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
