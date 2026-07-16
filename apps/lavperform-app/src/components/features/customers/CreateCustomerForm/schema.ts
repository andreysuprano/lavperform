import * as yup from 'yup'

import { regexPhone } from '@/utils/regex/phone'

const schema = yup.object({
  name: yup
    .string()
    .required('Informe o nome completo')
    .min(6, 'O nome deve ser completo'),
  phone: yup
    .string()
    .required('Informe o telefone')
    .matches(regexPhone, 'Informe um telefone válido'),
  email: yup.string().nullable().email('Informe um e-mail válido'),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
