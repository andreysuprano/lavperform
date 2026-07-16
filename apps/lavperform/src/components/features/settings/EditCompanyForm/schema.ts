import * as yup from 'yup'

import { regexPhone } from '@/utils/regex/phone'

const schema = yup.object({
  name: yup.string().required('Informe o nome da empresa'),
  cnpj: yup.string().required('Informe o CNPJ'),
  phone: yup
    .string()
    .required('Informe o telefone')
    .matches(regexPhone, 'Informe um telefone válido'),
  email: yup
    .string()
    .required('Informe o e-mail da empresa')
    .email('Informe um e-mail válido'),
  address: yup.object().shape({
    street: yup.string().required('Informe a rua'),
    number: yup.string().required('Informe o número'),
    complement: yup.string().nullable(),
    neighborhood: yup.string().required('Informe o bairro'),
    city: yup.string().required('Informe a cidade'),
    state: yup.string().required('Informe o estado'),
    zipCode: yup.string().required('Informe o CEP'),
  }),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
