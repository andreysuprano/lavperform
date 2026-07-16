import * as yup from 'yup'

const schema = yup.object({
  webhook: yup.string().nullable(),
  codigoLoja: yup.string().required('Informe o código da loja').nullable(),
  token: yup.string().required('Informe o token / apikey').nullable(),
  urlCardapio: yup.string().url('Informe uma URL válida').nullable(),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
