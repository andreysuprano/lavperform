export interface FormDataProps {
  businessPartnerId: string
  company: {
    city: string
    cnpj: string
    complement?: string
    email: string
    name: string
    neighborhood: string
    number: string
    phone: string
    state: string
    street: string
    zipCode: string
  }
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo?: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
  email: string
  name: string
  password: string
  phone: string
  planId: string
}

export interface OnboardingSuccessState {
  accountActivated: boolean
  invoiceUrl?: string | null
}

export interface FormStepsProps {
  id?: number
  onSubmit?: (data: FormData) => void
  formData?: Partial<FormDataProps>
  planIdFromUrl?: string | null
}
