import * as yup from 'yup'

const schema = yup.object({
  email: yup
    .string()
    .required('Informe o e-mail')
    .email('Informe um e-mail válido'),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
