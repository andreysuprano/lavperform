import * as yup from 'yup'

const schema = yup.object({
  state: yup
    .string()
    .oneOf(['PENDING', 'ACTIVE', 'INACTIVE'], 'Selecione um status válido')
    .required('O status é obrigatório'),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
