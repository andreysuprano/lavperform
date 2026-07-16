import * as yup from 'yup'

const linkSchema = yup.object({
  id: yup.string().nullable().optional(),
  label: yup.string().required('Label é obrigatório'),
  url: yup.string().url('URL inválida').required('URL é obrigatória'),
  icon: yup.string().nullable(),
  iconType: yup
    .string()
    .oneOf(['icon', 'emoji'], 'Tipo de ícone inválido')
    .nullable(),
})

const gallerySchema = yup.object({
  title: yup.string().required('Título é obrigatório'),
  description: yup.string().nullable(),
  imageUrl: yup
    .string()
    .url('URL da imagem inválida')
    .required('URL da imagem é obrigatória'),
})

const schema = yup.object({
  bgColor: yup.string().required('O campo cor de fundo é obrigatório'),
  biography: yup.string().required('O campo descrição é obrigatório'),
  coverImage: yup.string(),
  newImageUrl: yup
    .mixed()
    .nullable()
    .test('required', 'Informe a imagem do disparo', (value: any) => {
      if (value === null || value === undefined || value.length === 0) {
        return true
      }

      return value && value.length > 0
    })
    .test('fileType', 'Formato não suportado', (value: any) => {
      if (value === null || value === undefined || value.length === 0) {
        return true
      }

      return value && ['image/jpeg', 'image/png'].includes(value[0].type)
    }),
  whatsappMessage: yup
    .string()
    .required('O campo mensagem do WhatsApp é obrigatório'),
  links: yup.array().of(linkSchema).nullable(),
  galleries: yup.array().of(gallerySchema).nullable(),
})

type FormData = yup.InferType<typeof schema>

export { type FormData, schema }
