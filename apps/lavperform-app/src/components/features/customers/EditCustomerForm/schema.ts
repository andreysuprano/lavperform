import * as yup from 'yup'

import { regexPhoneDDI } from '@/utils/regex/phone'

const schema = yup.object({
  name: yup
    .string()
    .required('Informe o nome completo')
    .min(6, 'O nome deve ser completo'),
  phone: yup
    .string()
    .matches(regexPhoneDDI, 'Informe um telefone válido')
    .required('Informe o telefone'),
  email: yup.string().nullable().email('Informe um e-mail válido'),
  cpf: yup.string().nullable(),
  birthDate: yup.string().nullable(),
  firstOrderDate: yup.string().nullable(),
  rfvClassification: yup.string().nullable(),
  gender: yup.string().nullable(),
  observations: yup.string().nullable(),
  whatsappOptin: yup.boolean(),
  averageTicket: yup
    .number()
    .nullable()
    .transform((value, original) => (original === '' ? null : value)),
  address: yup
    .object({
      zipCode: yup.string().nullable(),
      street: yup.string().nullable(),
      number: yup.string().nullable(),
      complement: yup.string().nullable(),
      neighborhood: yup.string().nullable(),
      city: yup.string().nullable(),
      state: yup.string().nullable(),
    })
    .nullable(),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
