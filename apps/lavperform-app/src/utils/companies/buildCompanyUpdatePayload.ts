import type { Company } from '@/types'

export function buildCompanyUpdatePayload(
  company: Company,
  showTodayPurchases: boolean
) {
  return {
    name: company.name,
    cnpj: company.cnpj,
    email: company.email,
    phone: company.phone,
    address: {
      zipCode: company.address.zipCode,
      street: company.address.street,
      number: company.address.number,
      complement: company.address.complement,
      neighborhood: company.address.neighborhood,
      city: company.address.city,
      state: company.address.state,
    },
    showTodayPurchases,
  }
}
