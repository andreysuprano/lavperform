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
  email: string
  name: string
  password: string
  phone: string
  planId: string
}

export interface FormStepsProps {
  id?: number
  onSubmit?: (data: FormData) => void
  formData?: Partial<FormDataProps>
  planIdFromUrl?: string | null
}
