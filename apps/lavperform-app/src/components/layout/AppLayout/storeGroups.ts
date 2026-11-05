import type { UserCompany } from '@/types'

export type StoreGroup = {
  id: string
  label: string
  stores: UserCompany[]
}

function plain(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

export function initials(name: string): string {
  const words = plain(name)
    .split(/[\s—–-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '—')
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export function unitInitials(name: string): string {
  const pieces = name.split('—').map((part) => part.trim()).filter(Boolean)
  const unit = pieces.length > 1 ? pieces[pieces.length - 1] : name
  return initials(unit)
}

function groupLabel(stores: UserCompany[]): string {
  const heads = stores.map((store) => store.name.split('—')[0]?.trim() || store.name)
  if (heads.every((head) => head === heads[0])) return heads[0]
  return 'Lojas'
}

function groupKey(company: UserCompany) {
  if (company.companyId && company.companyId !== company.id) return company.companyId
  const head = company.name.split('—')[0]?.trim()
  return head || company.id
}

export function groupStores(companies: UserCompany[]): StoreGroup[] {
  const groups = new Map<string, UserCompany[]>()
  for (const company of companies) {
    const key = groupKey(company)
    const current = groups.get(key) ?? []
    current.push(company)
    groups.set(key, current)
  }
  return [...groups.entries()].map(([id, stores]) => ({
    id,
    label: groupLabel(stores),
    stores,
  }))
}

export function filterStoreGroups(groups: StoreGroup[], query: string): StoreGroup[] {
  const normalized = query
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
  if (!normalized) return groups
  return groups
    .map((group) => ({
      ...group,
      stores: group.stores.filter((store) => {
        const haystack = `${store.name} ${store.slug}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
        return haystack.includes(normalized)
      }),
    }))
    .filter((group) => group.stores.length > 0)
}
