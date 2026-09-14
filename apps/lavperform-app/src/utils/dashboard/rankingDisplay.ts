export type CompanyServiceModel = 'CONVENTIONAL' | 'SELF_SERVICE'
export type RankPeriod = 'month' | 'history'

export function isSelfServiceModel(
  model?: CompanyServiceModel | string | null,
): boolean {
  return model === 'SELF_SERVICE'
}

export function formatCount(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`
}

export function getPurchaseRankSubtitle(
  period: RankPeriod,
  showCycles: boolean,
) {
  const metric = showCycles ? 'ciclos' : 'vendas'
  return period === 'month'
    ? `Ordenado pelo número de ${metric} neste mês`
    : `Ordenado pelo número de ${metric}`
}

export function getRankingsIntro(showCycles: boolean) {
  return showCycles
    ? 'Top 10 por valor gasto e por número de ciclos. Clique para ver detalhes.'
    : 'Top 10 por valor gasto e por número de vendas. Clique para ver detalhes.'
}
