import * as yup from 'yup'

import { regexZipCode } from '@/utils/regex/cep'
import { regexCNPJ } from '@/utils/regex/cnpj'
import { regexPhone } from '@/utils/regex/phone'

const schemaUser = yup.object({
  name: yup.string().required('O nome é obrigatório'),

  email: yup
    .string()
    .email('O e-mail deve ser um endereço válido')
    .required('O e-mail é obrigatório'),

  password: yup
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .required('A senha é obrigatória'),

  confirmPassword: yup
    .string()
    .required('Confirme a senha')
    .oneOf([yup.ref('password')], 'As senhas devem ser iguais'),

  phone: yup
    .string()
    .matches(
      regexPhone,
      'O telefone deve estar no formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX'
    )
    .required('O telefone é obrigatório'),
})

const schemaCompany = yup.object({
  company: yup
    .object()
    .shape({
      name: yup.string().required('O nome da empresa é obrigatório'),

      cnpj: yup
        .string()
        .matches(
          regexCNPJ,
          'O CNPJ deve ter 14 dígitos e estar no formato válido'
        )
        .required('O CNPJ é obrigatório'),

      email: yup
        .string()
        .email('O e-mail da empresa deve ser um endereço válido')
        .required('O e-mail da empresa é obrigatório'),

      phone: yup
        .string()
        .matches(regexPhone, 'Telefone no formato inválido')
        .required('O telefone da empresa é obrigatório'),

      zipCode: yup
        .string()
        .matches(regexZipCode, 'O CEP deve estar no formato XXXXX-XXX')
        .required('O CEP é obrigatório'),

      street: yup.string().required('A rua é obrigatória'),

      number: yup.string().required('O número é obrigatório'),

      complement: yup.string().notRequired(),

      neighborhood: yup.string().required('O bairro é obrigatório'),

      city: yup.string().required('A cidade é obrigatória'),

      state: yup.string().required('O estado é obrigatório'),
    })
    .required('Os dados da empresa são obrigatórios'), // Garante que o objeto company esteja presente
})

const schemaPlan = yup.object({
  planId: yup.string().required('O plano é obrigatório'),
})

const schemaPayment = yup.object({
  creditCard: yup.object().shape({
    holderName: yup.string().required('O nome do titular é obrigatório.'),
    number: yup
      .string()
      .required('O número do cartão é obrigatório.')
      .transform((value) => value?.replace(/\s/g, '') ?? '')
      .matches(/^\d{13,19}$/, {
        message: 'Número do cartão inválido. Apenas números.',
        excludeEmptyString: true,
      }),
    expiryMonth: yup
      .string()
      .required('Mês é obrigatório.')
      .matches(/^(0[1-9]|1[0-2])$/, {
        message: 'Mês inválido (MM).',
        excludeEmptyString: true,
      }),
    expiryYear: yup
      .string()
      .required('Ano é obrigatório.')
      .matches(/^\d{2}$/, {
        message: 'O ano deve ter 2 dígitos (AA).',
        excludeEmptyString: true,
      }),
    ccv: yup
      .string()
      .required('CCV é obrigatório.')
      .matches(/^\d{3,4}$/, {
        message: 'CCV inválido (3 ou 4 dígitos).',
        excludeEmptyString: true,
      }),
  }),
})

const schema = schemaUser.concat(schemaCompany).concat(schemaPlan)

type FormData = yup.InferType<typeof schema>
type FormDataUser = yup.InferType<typeof schemaUser>
type FormDataCompany = yup.InferType<typeof schemaCompany>
type FormDataPlan = yup.InferType<typeof schemaPlan>
type FormDataPayment = yup.InferType<typeof schemaPayment>

export {
  type FormData,
  type FormDataCompany,
  type FormDataPayment,
  type FormDataPlan,
  type FormDataUser,
  schema,
  schemaCompany,
  schemaPayment,
  schemaPlan,
  schemaUser,
}
