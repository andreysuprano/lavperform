import * as yup from 'yup'

const schema = yup.object({
  email: yup
    .string()
    .required('Informe o e-mail')
    .email('Informe um e-mail válido'),
  password: yup
    .string()
    .required('Informe a senha')
    .min(6, 'Informe pelo menos 6 caracteres'),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
