import * as yup from 'yup'

function buildSchema(partnerSlug?: string) {
  const isVmLav = partnerSlug?.trim().toUpperCase() === 'VMLAV'

  return yup.object({
    webhook: yup.string().nullable(),
    codigoLoja: isVmLav
      ? yup
          .string()
          .nullable()
          .test(
            'cnpj',
            'Informe um CNPJ válido com 14 dígitos',
            (value) => {
              const digits = (value ?? '').replace(/\D/g, '')
              return digits.length === 0 || digits.length === 14
            },
          )
      : yup.string().required('Informe o código da loja').nullable(),
    token: yup.string().required('Informe o token / apikey').nullable(),
    apiSecret: yup.string().nullable(),
    apiPassword: yup.string().nullable(),
    urlCardapio: yup.string().url('Informe uma URL válida').nullable(),
  })
}

const schema = buildSchema()

type FormData = yup.InferType<typeof schema>

export { type FormData, buildSchema, schema }
