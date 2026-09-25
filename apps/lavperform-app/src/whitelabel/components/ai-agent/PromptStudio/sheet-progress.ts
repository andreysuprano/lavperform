export function progress(answered: number, total: number): number {
  if (total === 0) return 0
  return Math.round((answered / total) * 100)
}
