export interface InvoiceItem {
  id: string
  planName: string
  planDescription: string
  planPrice: string
  billingType: string
  nextDueDate: string
  status: string
  card: string
  dateCreated: string
  invoiceNumber?: string
}

export interface CompanyAddress {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface CompanyDetails {
  id: string
  name?: string
  cnpj?: string
  address?: CompanyAddress
}

export interface Props {
  data: InvoiceItem | null
  company: CompanyDetails | null
  onClose: () => void
  allowBoleto?: boolean
  allowPix?: boolean
  planAllowsAlternativePayments?: boolean
  alternativePaymentLabel?: string
}
