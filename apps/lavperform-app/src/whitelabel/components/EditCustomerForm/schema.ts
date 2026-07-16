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
  birthDate: yup.string().nullable(),
  whatsappOptin: yup.boolean(),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
