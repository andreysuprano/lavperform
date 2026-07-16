import * as yup from 'yup'

const MAX_FILE_SIZE_IN_MB = 5 * 1024 * 1024 // 5MB
const MAX_FILE_SIZE = 5 // 5MB

const schema = yup.object({
  name: yup.string().required('Informe o nome do parceiro'),
  email: yup
    .string()
    .email('Informe um e-mail válido')
    .required('Informe o e-mail do parceiro'),
  phone: yup.string().required('Informe o telefone do parceiro'),
  cnpj: yup.string().required('Informe o CNPJ do parceiro'),
  avatarUrl: yup
    .mixed()
    .test('required', 'Informe a imagem do parceiro', (value: any) => {
      return value && value.length > 0
    })
    .test(
      'fileSize',
      `A imagem está com mais de ${MAX_FILE_SIZE}MB`,
      (value: any) => {
        if (value === null || value === undefined || value.length === 0) {
          return true
        }

        return value && value.length > 0 && value[0].size <= MAX_FILE_SIZE_IN_MB
      }
    )
    .test('fileType', 'Formato não suportado', (value: any) => {
      if (value === null || value === undefined || value.length === 0) {
        return true
      }

      return value && ['image/jpeg', 'image/png'].includes(value[0].type)
    }),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, MAX_FILE_SIZE, MAX_FILE_SIZE_IN_MB, schema }
