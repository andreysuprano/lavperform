import { ClientTypes } from '@/utils/constants/clientType'

export interface FormattedCustomer {
  name: string | null
  phone: string | null
  email: string | null
  birthDate: string | null
  firstOrderDate: string | null
  rfvClassification: ClientTypes | null
  gender: string | null
  observations: string | null
  whatsappOptin: boolean
  averageTicket: number | null
  address: {
    street: string | null
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  }
}
