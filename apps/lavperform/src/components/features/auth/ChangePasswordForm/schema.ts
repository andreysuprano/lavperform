import * as yup from 'yup'

const schema = yup.object({
  code: yup
    .array()
    .of(
      yup
        .string()
        .length(1, 'Cada campo deve ter apenas um caracter.')
        .matches(/[0-9]/, 'Cada campo deve conter apenas números.')
        .required('Todos os campos são obrigatórios.')
    )
    .length(5, 'O código deve ter 5 caracteres.')
    .required('O campo de código é obrigatório.'),
  password: yup
    .string()
    .required('Informe a senha')
    .min(6, 'Informe pelo menos 6 caracteres'),
  confirmPassword: yup
    .string()
    .required('Confirme a senha')
    .oneOf([yup.ref('password')], 'As senhas devem ser iguais'),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
