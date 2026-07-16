import {
  Control,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormHandleSubmit,
  UseFormRegister,
} from 'react-hook-form'

export interface CreditCardFormFields {
  creditCard: {
    name: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo: {
    name_holder: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
}

export interface Props {
  isOpen: boolean
  isLoading: boolean
  isLastInvoiceBoletoOrPix: boolean
  onOpenChange: (open: boolean) => void
  register: UseFormRegister<CreditCardFormFields>
  control: Control<CreditCardFormFields>
  handleSubmit: UseFormHandleSubmit<CreditCardFormFields>
  onSave: SubmitHandler<CreditCardFormFields>
  onValidationError: SubmitErrorHandler<CreditCardFormFields>
}
