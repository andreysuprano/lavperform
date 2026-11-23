import * as yup from 'yup'

import { fieldCopy } from './partner-fields'

function buildSchema(partnerSlug?: string, requiredFields: string[] = []) {
  const slug = partnerSlug?.trim().toUpperCase()
  const catalog = requiredFields.length > 0
  const storeRequired = catalog
    ? requiredFields.includes('merchantId')
    : slug !== 'VMLAV' && slug !== 'MAXLAV'
  const secretRequired = requiredFields.includes('apiSecret')
  const passwordRequired = requiredFields.includes('password')
  const storeLabel = fieldCopy(partnerSlug, 'merchantId').label
  const tokenLabel = fieldCopy(partnerSlug, 'apiKey').label
  const secretLabel = fieldCopy(partnerSlug, 'apiSecret').label

  return yup.object({
    webhook: yup.string().nullable(),
    codigoLoja: storeRequired
      ? yup.string().required(`${storeLabel} é obrigatório`).nullable()
      : slug === 'VMLAV'
        ? yup
            .string()
            .nullable()
            .test('cnpj', 'Informe um CNPJ válido com 14 dígitos', (value) => {
              const digits = (value ?? '').replace(/\D/g, '')
              return digits.length === 0 || digits.length === 14
            })
        : yup.string().nullable(),
    token: yup.string().required(`${tokenLabel} é obrigatório`).nullable(),
    apiSecret: secretRequired
      ? yup.string().required(`${secretLabel} é obrigatório`).nullable()
      : yup.string().nullable(),
    apiPassword: passwordRequired
      ? yup.string().required('Informe a senha da API').nullable()
      : yup.string().nullable(),
    urlCardapio: yup
      .string()
      .nullable()
      .transform((value) => {
        const trimmed = typeof value === 'string' ? value.trim() : value
        return trimmed ? trimmed : null
      })
      .url('Informe uma URL válida'),
  })
}

const schema = buildSchema()

type FormData = yup.InferType<typeof schema>

export { type FormData, buildSchema, schema }
